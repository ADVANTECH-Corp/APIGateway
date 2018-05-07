INSTALL_FILES=app.js apps inc node_modules package.json routes script uninstall.bash views

all:
	echo "nothing"

install: 
	mkdir -p $(DESTDIR)/usr/local/EdgeSense/API-GW
	mkdir -p $(DESTDIR)/etc/systemd/system
	cp -rf ${INSTALL_FILES} $(DESTDIR)/usr/local/EdgeSense/API-GW
	cp API-GW.service $(DESTDIR)/etc/systemd/system

