all:
	echo "nothing"

install: 
	mkdir -p $(DESTDIR)/usr/local/lib/node_modules/APIGateway
	mkdir -p $(DESTDIR)/etc/systemd/system
	cp -rf * $(DESTDIR)/usr/local/lib/node_modules/APIGateway
	cp apigw.service $(DESTDIR)/etc/systemd/system

