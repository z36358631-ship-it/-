const { resolveGameUrl } = require("../../routing");

Page({
  data: {
    src: "",
    error: "",
  },

  onLoad(options) {
    const key = typeof options.game === "string" ? options.game : "ricochet";
    const baseUrl = getApp().globalData.h5BaseUrl;
    const src = resolveGameUrl(baseUrl, key);
    if (!src) {
      this.setData({
        src: "",
        error: "配置错误：请先设置已审核的 HTTPS 业务域名。",
      });
      return;
    }
    this.setData({ src, error: "" });
  },

  back() {
    wx.navigateBack();
  },
});
