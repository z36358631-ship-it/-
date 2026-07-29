Page({
  data: {
    games: [
      {
        key: "ricochet",
        title: "弹珠暴走团",
        summary: "战术弹射与连锁破坏",
      },
      {
        key: "nightmarket",
        title: "怪兽夜市",
        summary: "行列滑动与配方经营",
      },
      {
        key: "squad",
        title: "三路小队",
        summary: "拖放换路与集火打断",
      },
    ],
  },

  openGame(event) {
    const key = event.currentTarget.dataset.game;
    wx.navigateTo({
      url: `/pages/game/game?game=${encodeURIComponent(key)}`,
    });
  },
});
