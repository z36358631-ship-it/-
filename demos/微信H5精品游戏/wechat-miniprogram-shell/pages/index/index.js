Page({
  data: {
    games: [
      {
        id: "five",
        order: "01",
        title: "五秒之后",
        genre: "时间回声 · 协作解谜",
        summary: "让五秒前的自己回来，与现在并肩破局。",
        accent: "cyan"
      },
      {
        id: "mender",
        order: "02",
        title: "世界缝补师",
        genre: "有限资源 · 路线取舍",
        summary: "用有限金线缝合道路，把小生命送回花园。",
        accent: "gold"
      },
      {
        id: "hunter",
        order: "03",
        title: "裂隙猎人",
        genre: "自动战斗 · 风险撤离",
        summary: "继续贪取更高价值，还是趁现在安全带出？",
        accent: "violet"
      }
    ]
  },

  openGame(event) {
    const game = event.currentTarget.dataset.game;
    if (!["five", "mender", "hunter"].includes(game)) return;
    wx.navigateTo({
      url: `/pages/game/game?game=${encodeURIComponent(game)}`
    });
  }
});
