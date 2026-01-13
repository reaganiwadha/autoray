{
  description = "Autoray Dev Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            uv
            goose
            postgresql
            process-compose
            minio
            minio-client
            ffmpeg
          ];

          shellHook = ''
            if [ -f .env ]; then
              set -a; source .env; set +a
            fi
            export PGDATA=$PWD/.data/pgdata
            export PGHOST=$PWD/.data/pgrun
            export PGPORT=5432
            export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/autoray?sslmode=disable"
            
            mkdir -p $PGHOST
          '';
        };
      }
    );
}
