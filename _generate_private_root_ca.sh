openssl genrsa -out my-root-ca.key.pem 4096
openssl req -x509 -new -nodes -key my-root-ca.key.pem -sha256 -days 3650 \
  -out my-root-ca.cert.pem -subj "/C=DE/ST=Bayern/L=Marktheidenfeld/O=Schneider Electric/CN=MaeLog Root CA"