import { useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import {
  ingredientHistoryService,
  filterIngredientHistory,
} from "../services/ingredientHistoryService";
import { Feedback, PageTitle, Pagination, SearchInput } from "../components/ui";
export default function IngredientHistoryPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(6);
  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState("");
  const resource = useResource(
    () => ingredientHistoryService.list(user!.role, page, size),
    [user!.role, page, size],
  );
  const data = resource.data;
  const rows = filterIngredientHistory(data?.items || [], search, unit);
  const units = [...new Set((data?.items || []).map((i) => i.unit))].sort();
  function changePage(p: number, s = size) {
    setPage(p);
    setSize(s);
    setSearch("");
    setUnit("");
  }
  return (
    <>
      <PageTitle
        eyebrow="BẾP TRUNG TÂM / NGUYÊN LIỆU"
        title="Lịch sử sử dụng nguyên liệu"
        description="Tra cứu các dòng nguyên liệu đã ghi nhận khi bắt đầu chế biến."
      >
        <button
          className="button secondary"
          disabled={resource.loading}
          onClick={() => void resource.reload()}
        >
          <RefreshCw size={16} /> Tải lại
        </button>
      </PageTitle>
      <div className="recipe-banner">
        <History size={32} />
        <div>
          <strong>Theo dõi nguyên liệu đã sử dụng</strong>
          <p>
            Các bản ghi mới nhất được xếp trước. Dữ liệu hiện có gồm tên, số
            lượng và đơn vị; chưa có ngày sử dụng hoặc mã đơn để tra cứu.
          </p>
        </div>
      </div>
      <Feedback
        loading={resource.loading}
        error={resource.error}
        retry={resource.reload}
      />
      {!resource.loading && !resource.error && data && (
        <>
          <div className="mini-stats">
            <div>
              <span>Tổng bản ghi</span>
              <b>{data.totalRecords.toLocaleString("vi-VN")}</b>
            </div>
            <div>
              <span>Bản ghi trên trang</span>
              <b>{data.items.length}</b>
            </div>
            <div>
              <span>Khớp bộ lọc trên trang</span>
              <b>{rows.length}</b>
            </div>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Chi tiết sử dụng nguyên liệu</h2>
                <p>Tìm tên và lọc đơn vị trong trang hiện tại.</p>
              </div>
            </div>
            <div className="toolbar wrap">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Tìm tên nguyên liệu trong trang…"
              />
              <select
                aria-label="Đơn vị trong trang"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="">Tất cả đơn vị</option>
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u || "Chưa có đơn vị"}
                  </option>
                ))}
              </select>
              <button
                className="button secondary"
                onClick={() => {
                  setSearch("");
                  setUnit("");
                }}
              >
                Bỏ lọc
              </button>
            </div>
            {!rows.length ? (
              <div className="feedback">
                <History />
                <b>
                  {data.totalRecords === 0
                    ? "Chưa có lịch sử sử dụng nguyên liệu"
                    : "Không có kết quả phù hợp trên trang này"}
                </b>
                <span>Thử bỏ bộ lọc hoặc chuyển trang.</span>
                {page > 1 && (
                  <button
                    className="button secondary"
                    onClick={() => changePage(1)}
                  >
                    Về trang đầu
                  </button>
                )}
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>NGUYÊN LIỆU</th>
                      <th>SỐ LƯỢNG ĐÃ DÙNG</th>
                      <th>ĐƠN VỊ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((i, index) => (
                      <tr key={`${page}:${index}`}>
                        <td>{(page - 1) * size + data.items.indexOf(i) + 1}</td>
                        <td>
                          <strong>
                            {i.ingredientName === "N/A"
                              ? "Nguyên liệu không còn trong danh mục"
                              : i.ingredientName}
                          </strong>
                          <small>{i.ingredientId}</small>
                        </td>
                        <td>
                          {i.quantityUsed.toLocaleString("vi-VN", {
                            maximumFractionDigits: 20,
                          })}
                        </td>
                        <td>{i.unit || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              page={page}
              size={size}
              total={data.totalRecords}
              onPage={(p) => changePage(p)}
              onSize={(s) => changePage(1, s)}
            />
          </section>
          <p className="muted">
            Các dòng được giữ riêng theo lịch sử ghi nhận. Không cộng số lượng
            giữa các nguyên liệu hoặc đơn vị khác nhau.
          </p>
        </>
      )}
    </>
  );
}
