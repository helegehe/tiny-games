class AssetManager {
  constructor() {
    this.images = {};
    this.manifest = {
      bg: ['assets/images/title_bg.png', 'assets/images/title_bg.svg'],
      button: ['assets/images/button_primary.png', 'assets/images/button_primary.svg'],
      coin: ['assets/images/icon_coin.png', 'assets/images/icon_coin.svg'],
      card: ['assets/images/card_placeholder.png', 'assets/images/card_placeholder.svg']
    };
  }

  loadAll() {
    const keys = Object.keys(this.manifest);
    const jobs = [];
    for (let i = 0; i < keys.length; i += 1) {
      jobs.push(this.loadImageFallback(keys[i], this.manifest[keys[i]]));
    }
    return Promise.all(jobs);
  }

  loadImageFallback(key, srcList) {
    const list = Array.isArray(srcList) ? srcList : [srcList];
    const tryLoad = (index) => {
      if (index >= list.length) {
        this.images[key] = null;
        return Promise.resolve(null);
      }
      return this.loadImage(key, list[index]).then((img) => {
        if (img) return img;
        return tryLoad(index + 1);
      });
    };
    return tryLoad(0);
  }

  loadImage(key, src) {
    return new Promise((resolve) => {
      let img = null;
      try {
        if (typeof wx !== 'undefined' && wx.createImage) {
          img = wx.createImage();
        } else if (typeof Image !== 'undefined') {
          img = new Image();
        }
      } catch (e) {
        img = null;
      }

      if (!img) {
        this.images[key] = null;
        resolve(null);
        return;
      }

      img.onload = () => {
        this.images[key] = img;
        resolve(img);
      };
      img.onerror = () => {
        this.images[key] = null;
        resolve(null);
      };

      img.src = src;
    });
  }

  getImage(key) {
    return this.images[key] || null;
  }
}

module.exports = {
  AssetManager
};
