export const isNumberStepKey = (key: string) => key === "ArrowUp" || key === "ArrowDown";

export const blockNumberStepKeys = (event: { key: string; preventDefault: () => void }) => {
  if (isNumberStepKey(event.key)) {
    event.preventDefault();
  }
};

export const blurNumberInputOnWheel = (event: { currentTarget: { blur: () => void } }) => {
  event.currentTarget.blur();
};
