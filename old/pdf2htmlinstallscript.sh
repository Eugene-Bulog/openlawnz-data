#!/bin/bash
# Ubuntu Developer Script For pdf2htmlEx
# Created by Rajeev Kannav Sharma
# http://rajeevkannav.github.io/
#
#
# Downloads and configures the following:
#
#   CMake, pkg-config
#   GNU Getopt
#   GCC
#   poppler
#   fontforge
#   pdf2htmlEX


############################### How to use ###############################
# [sudo] chmod 775 pdf2htmlEX.sh
# [sudo] ./pdf2htmlEX.sh

HOME_PATH=$(cd ~/ && pwd)
LINUX_ARCH="$(lscpu | grep 'Architecture' | awk -F\: '{ print $2 }' | tr -d ' ')"
POPPLER_SOURCE="http://poppler.freedesktop.org/poppler-0.33.0.tar.xz"
FONTFORGE_SOURCE="https://github.com/coolwanglu/fontforge.git"
PDF2HTMLEX_SOURCE="https://github.com/coolwanglu/pdf2htmlEX.git"

if [ "$LINUX_ARCH" == "x86_64" ]; then
 
  echo "Updating all Ubuntu software repository lists ..."
apt-get update
  echo "Installing basic dependencies ..."
apt-get install -qq -y cmake gcc libgetopt++-dev git
  echo "Installing Poppler ..."
apt-get install -qq -y pkg-config libopenjpeg-dev libfontconfig1-dev libfontforge-dev poppler-data poppler-utils poppler-dbg

  echo "Downloading poppler via source ..."
cd "$HOME_PATH"
wget "$POPPLER_SOURCE"
tar -xvf poppler-0.33.0.tar.xz
cd poppler-0.33.0/
./configure --enable-xpdf-headers --prefix=/usr 
make
make install

  echo "Installing fontforge ..."
cd "$HOME_PATH"
apt-get install -qq -y packaging-dev pkg-config python-dev libpango1.0-dev libglib2.0-dev libxml2-dev giflib-dbg
apt-get install -qq -y libjpeg-dev libtiff-dev uthash-dev libspiro-dev
  echo "cloning fontforge via source ..."
git clone --depth 1 "$FONTFORGE_SOURCE"
cd fontforge/
./bootstrap
./configure
make
sudo make install

  echo "Installing Pdf2htmlEx ..."
cd "$HOME_PATH"
git clone --depth 1 "$PDF2HTMLEX_SOURCE"
cd pdf2htmlEX/
cmake .
make
sudo make install

echo 'export LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc

# commenting out for testing
# cd "$HOME_PATH" && rm -rf "poppler-0.33.0.tar.xz"
# cd "$HOME_PATH" && rm -rf "poppler-0.33.0"
# "$HOME_PATH" && rm -rf "fontforge"
# "$HOME_PATH" && rm -rf "pdf2htmlEX"

export LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH

else
  echo "********************************************************************"
  echo "This script currently doesn't supports $LINUX_ARCH Linux archtecture"
fi
 
echo "----------------------------------"
echo "Restart your Ubuntu session for installation to complete..."