"""Servidor local do FitCPX Lite (usado por abrir-fitcpx.bat).

Igual ao `python -m http.server`, mas manda "Cache-Control: no-store". O servidor padrão do Python não
manda cabeçalho de cache e o Chrome passa a reaproveitar JS e CSS velhos, o que já causou tela preta
e funções antigas rodando depois de uma atualização. Só para uso local; não sobe para a hospedagem.
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class SemCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, formato, *args):   # terminal limpo: só erros
        if len(args) > 1 and str(args[1]).startswith(("4", "5")):
            super().log_message(formato, *args)


if __name__ == "__main__":
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    ThreadingHTTPServer(("", porta), SemCache).serve_forever()
