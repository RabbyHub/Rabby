export const getMaxModalHeight = () => {
  const h = window.innerHeight;
  return h > 800 ? 770 : h - 40;
};
