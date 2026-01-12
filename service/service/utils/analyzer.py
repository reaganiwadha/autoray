import asyncio
from sqlmodel import Session, select
from service.core.database import get_session
from service.core.storage import Storage, get_storage_client
from service.models.media import Media
from service.models.project_media import ProjectMedia
from service.models.media_summary import MediaSummary
from service.utils.openrouter import get_openrouter_client
from service.core.websocket_manager import manager
import io

class AnalyzerJob:
    def __init__(self, session_factory):
        self.session_factory = session_factory
        self.is_running = False

    async def start(self):
        self.is_running = True
        while self.is_running:
            try:
                await self.process_pending_media()
            except Exception as e:
                print(f"AnalyzerJob error: {e}")
            await asyncio.sleep(30)  # Check every 30 seconds

    def stop(self):
        self.is_running = False

    async def process_pending_media(self):
        # We need a new session for each run if we are in a loop
        # But get_session is a dependency, so we might need a different way or use it manually
        # For now, let's assume we can get a session from the factory
        with next(self.session_factory()) as session:
            # Find media that are in at least one project and have no 'visual' summary
            # and are images
            statement = (
                select(Media)
                .join(ProjectMedia, Media.id == ProjectMedia.media_id)
                .outerjoin(MediaSummary, (Media.id == MediaSummary.media_id) & (MediaSummary.type == "visual"))
                .where(MediaSummary.id == None)
                .where(Media.content_type.like("image/%"))
                .distinct()
            )
            
            pending_media = session.exec(statement).all()
            
            if not pending_media:
                return

            print(f"Found {len(pending_media)} media items pending analysis")
            
            client = get_openrouter_client()
            s3 = get_storage_client()
            bucket = Storage.get_bucket_name()

            for media in pending_media:
                print(f"Analyzing media {media.id}: {media.filename}")
                try:
                    # Download image
                    response = s3.get_object(bucket, media.s3_key)
                    image_bytes = response.read()
                    
                    summary_text = await client.describe_image(image_bytes, media.content_type)
                    
                    if summary_text:
                        summary = MediaSummary(
                            media_id=media.id,
                            type="visual",
                            summary=summary_text,
                            model_name="openai/gpt-5-image-mini"
                        )
                        session.add(summary)
                        session.commit()
                        print(f"Successfully analyzed media {media.id}")
                        
                        # Notify user
                        await manager.send_personal_message({
                            "type": "MEDIA_ANALYSIS_COMPLETE",
                            "media_id": media.id,
                            "analysis_type": "visual",
                            "summary": summary_text
                        }, media.user_id)
                        
                except Exception as e:
                    print(f"Error analyzing media {media.id}: {e}")
                finally:
                    if 'response' in locals():
                        response.close()
                        response.release_conn()

analyzer_job = None

def start_analyzer_job():
    global analyzer_job
    if analyzer_job is None:
        from service.core.database import get_session
        analyzer_job = AnalyzerJob(get_session)
        asyncio.create_task(analyzer_job.start())
