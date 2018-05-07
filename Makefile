all:
	echo "nothing"

install: 
	mkdir -p $(DESTDIR)/usr/local/EdgeSense/API-GW
	mkdir -p $(DESTDIR)/etc/systemd/system
	cp -rf * $(DESTDIR)/usr/local/EdgeSense/API-GW
	cp API-GW.service $(DESTDIR)/etc/systemd/system

