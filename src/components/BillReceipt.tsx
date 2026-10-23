import { Printer } from "lucide-react";
import type { Bill } from "../types/bill";
import { date, money } from "./ui";

export default function BillReceipt({ bill }: { bill: Bill }) {
  return (
    <section className="bill-receipt" aria-label="Chi tiết hóa đơn">
      <div className="receipt-brand">
        <strong>{bill.storeName}</strong>
        <span>{bill.storeAddress || ""}</span>
      </div>
      <h2>HÓA ĐƠN BÁN HÀNG</h2>
      <dl className="receipt-meta">
        <dt>Mã hóa đơn</dt>
        <dd>{bill.billId}</dd>
        <dt>Thời gian</dt>
        <dd>{date(bill.createdTime)}</dd>
        <dt>Nhân viên</dt>
        <dd>{bill.staffName || "—"}</dd>
      </dl>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>SẢN PHẨM</th>
              <th>SL</th>
              <th>ĐƠN GIÁ</th>
              <th>THÀNH TIỀN</th>
            </tr>
          </thead>
          <tbody>
            {bill.details.map((line, index) => (
              <tr key={line.billDetailId || index}>
                <td>{line.productName}</td>
                <td>
                  {line.quantity} {line.unit || ""}
                </td>
                <td>{money(line.unitPrice)}</td>
                <td>{money(line.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="receipt-total">
        <span>Tổng cộng</span>
        <strong>{money(bill.totalAmount)}</strong>
      </div>
      {bill.note && (
        <p className="receipt-note">
          <b>Ghi chú:</b> {bill.note}
        </p>
      )}
      <p className="receipt-thanks">Cảm ơn bạn đã lựa chọn cửa hàng!</p>
      <button
        className="button primary receipt-print"
        onClick={() => window.print()}
      >
        <Printer size={17} /> In hóa đơn
      </button>
    </section>
  );
}
