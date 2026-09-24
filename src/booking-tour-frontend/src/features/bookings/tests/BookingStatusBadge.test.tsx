import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookingStatusBadge, PaymentStatusBadge } from "../components/BookingStatusBadge";

describe("BookingStatusBadge", () => {
  it.each([
    ["PENDING", "Chờ thanh toán"],
    ["CONFIRMED", "Đã xác nhận"],
    ["COMPLETED", "Đã hoàn thành"],
    ["CANCELLED", "Đã huỷ"],
    ["EXPIRED", "Hết hạn"],
  ] as const)("%s hiển thị chữ “%s” (không chỉ dựa vào màu)", (status, label) => {
    render(<BookingStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("mỗi trạng thái có màu riêng", () => {
    const { rerender } = render(<BookingStatusBadge status="PENDING" />);
    const pendingClass = screen.getByText("Chờ thanh toán").className;
    rerender(<BookingStatusBadge status="CANCELLED" />);
    expect(screen.getByText("Đã huỷ").className).not.toBe(pendingClass);
  });

  it("PaymentStatusBadge", () => {
    render(<PaymentStatusBadge status="REFUNDED" />);
    expect(screen.getByText("Đã hoàn tiền")).toBeInTheDocument();
  });
});
