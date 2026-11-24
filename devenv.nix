{ pkgs, ... }:

let
  port = 8000;
  pidFile = ".devenv/http-server.pid";
in
{
  packages = [ pkgs.python3 ];

  env.SITE_PORT = toString port;

  # Serve the static site as soon as you enter the shell (once per project).
  enterShell = ''
    if [ -f ${pidFile} ] && kill -0 "$(cat ${pidFile})" 2>/dev/null; then
      echo "Site already served at http://localhost:${toString port}"
    else
      python -m http.server ${toString port} --bind 127.0.0.1 >/dev/null 2>&1 &
      echo $! > ${pidFile}
      echo "Serving site at http://localhost:${toString port} (pid $(cat ${pidFile}))"
    fi
  '';

  scripts.stop-server.exec = ''
    if [ -f ${pidFile} ]; then
      kill "$(cat ${pidFile})" 2>/dev/null && echo "Server stopped"
      rm -f ${pidFile}
    fi
  '';
}
