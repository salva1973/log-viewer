openssl req -nodes -new -x509 -keyout key.pem -out cert.pem -days 3650

openssl genrsa -out key.pem 2048

openssl req -new -key key.pem -out server.csr.pem -subj "/C=DE/ST=Bayern/L=Marktheidenfeld/O=Schneider Electric/CN=localhost"