import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuantityStepper } from "../components/QuantityStepper";

function Harness({ min = 1, max = 3, initial = 1, onChange }: { min?: number; max?: number; initial?: number; onChange?: (n: number) => void }) {
  const [v, setV] = useState(initial);
  return (
    <QuantityStepper
      id="adult"
      label="Số vé người lớn"
      value={v}
      min={min}
      max={max}
      onChange={(n) => {
        setV(n);
        onChange?.(n);
      }}
    />
  );
}

describe("QuantityStepper", () => {
  it("có nhãn gắn với ô nhập (getByLabelText)", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Số vé người lớn")).toHaveValue(1);
  });

  it("tăng tới max thì khoá nút tăng", async () => {
    const user = userEvent.setup();
    render(<Harness max={3} />);
    const inc = screen.getByRole("button", { name: "Tăng số vé người lớn" });
    await user.click(inc);
    await user.click(inc);
    expect(screen.getByLabelText("Số vé người lớn")).toHaveValue(3);
    expect(inc).toBeDisabled();
    await user.click(inc);
    expect(screen.getByLabelText("Số vé người lớn")).toHaveValue(3);
  });

  it("không giảm dưới min", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness min={1} initial={2} onChange={onChange} />);
    const dec = screen.getByRole("button", { name: "Giảm số vé người lớn" });
    await user.click(dec);
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(dec).toBeDisabled();
  });

  it("nhập tay vượt giới hạn thì bị kẹp lại", async () => {
    const user = userEvent.setup();
    render(<Harness min={0} max={4} initial={0} />);
    const input = screen.getByLabelText("Số vé người lớn");
    await user.clear(input);
    await user.type(input, "9");
    expect(input).toHaveValue(4);
  });
});
