const ROUTES = Object.freeze({
  five: {
    title: "五秒之后",
    file: "01-five-seconds-later.html"
  },
  mender: {
    title: "世界缝补师",
    file: "02-world-mender.html"
  },
  hunter: {
    title: "裂隙猎人",
    file: "03-rift-hunter.html"
  }
});

function normalizeBaseUrl(value) {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  const httpsDirectory = /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*(?:\/[^\s?#]*)?$/i;
  return httpsDirectory.test(normalized) ? normalized : "";
}

Page({
  data: {
    ready: false,
    gameUrl: "",
    gameTitle: "",
    error: ""
  },

  onLoad(options) {
    const route = ROUTES[options.game];
    const baseUrl = normalizeBaseUrl(getApp().globalData.h5GameBaseUrl);

    if (!route) {
      wx.setNavigationBarTitle({ title: "游戏未找到" });
      this.setData({
        gameTitle: "游戏未找到",
        error: "链接中的游戏标识无效，请返回游戏列表重新选择。"
      });
      return;
    }

    wx.setNavigationBarTitle({ title: route.title });

    if (!baseUrl) {
      this.setData({
        gameTitle: route.title,
        error: "请先在 app.js 中配置已备案并加入业务域名的 HTTPS 游戏目录。"
      });
      return;
    }

    this.setData({
      ready: true,
      gameTitle: route.title,
      gameUrl: `${baseUrl}/${route.file}`
    });
  },

  goBack() {
    wx.navigateBack({
      fail: () => wx.reLaunch({ url: "/pages/index/index" })
    });
  }
});
