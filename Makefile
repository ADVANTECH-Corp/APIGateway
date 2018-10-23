all:
	echo "nothing"

install: 
	mkdir -p $(DESTDIR)/usr/local/EdgeSense/API-GW
	mkdir -p $(DESTDIR)/etc/systemd/system
	cp -rf app.js inc node_modules routes views apps install.js package.json uninstall.js $(DESTDIR)/usr/local/EdgeSense/API-GW
	cp API-GW.service $(DESTDIR)/etc/systemd/system
