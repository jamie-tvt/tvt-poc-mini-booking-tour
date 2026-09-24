/** Thay next/font/google: font nạp bằng thẻ <link> trong index.html (offline thì dùng font hệ thống). */
type FontOptions = { variable?: string };
const make = (opts: FontOptions = {}) => ({ className: "", variable: "", style: { fontFamily: "inherit" }, ...{ _var: opts.variable } });
export const Be_Vietnam_Pro = make;
export const Noto_Sans = make;
