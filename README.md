# Franchise Workspace

React + TypeScript + Vite. Cấu trúc theo `../cautruc.txt`, đặt trực tiếp trong `FranchiseFE/`.

## Chạy local

```sh
npm install
cp .env.example .env
npm run dev
```

Truy cập http://127.0.0.1:5173. Chạy backend `Franchise` ở cổng 5000 và cấu hình database của backend trước. Dùng tài khoản thật đã có trong database để đăng nhập; frontend không tạo tài khoản mặc định.

`.env` đặt `VITE_API_BASE_URL=/api`; Vite chuyển tiếp `/api` đến http://localhost:5000. Đổi `API_PROXY_TARGET` nếu backend dùng cổng khác. Khi triển khai production, reverse proxy `/api` tới backend hoặc cấu hình `VITE_API_BASE_URL` thành URL API và cấu hình CORS phía backend. Biến `VITE_*` công khai trong bundle, không đặt bí mật ở đây. SPA hosting cần fallback về `index.html`.

```sh
npm run build
npm test
npm run preview
```

## Chức năng giai đoạn đầu

| Role              | Màn hình và thao tác                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| ADMIN             | Dashboard, xem/tạo sản phẩm, xem đơn, xem/tạo nguyên liệu, danh sách tài khoản và khóa/mở khóa |
| MANAGER           | Dashboard cửa hàng, sản phẩm, đơn của cửa hàng được gán, danh sách tài khoản                   |
| STORESTAFF        | Dashboard cửa hàng, sản phẩm, tra cứu đơn của cửa hàng được gán                                |
| KITCHENSTAFF      | Dashboard bếp, hàng đợi nấu, bắt đầu/hoàn tất nấu, tra cứu nguyên liệu                         |
| SUPPLYCOORDINATOR | Dashboard cung ứng, nhận đơn, chuyển bếp, nhận từ bếp, xác nhận đến cửa hàng                   |

- Header, Sidebar theo role, ProductCard, Footer, dialog xác nhận, giao diện mobile.
- Sản phẩm: tìm tên, lọc danh mục, sắp tên/giá, phân trang, chi tiết, tạo sản phẩm cho ADMIN.
- Nguyên liệu: tìm tên, phân trang, tạo cho ADMIN.
- Tài khoản: tìm tên/email, lọc role, phân trang, xác nhận khóa/mở khóa. Không cho tự khóa tài khoản đang đăng nhập ở UI.
- Đơn: tìm mã/ghi chú và tên món khi API có trả chi tiết; lọc trạng thái, từ ngày/đến ngày theo thời gian gửi, phân trang, chi tiết tổng quan. Giữ nguyên đơn chưa có thời gian gửi khi không lọc ngày.
- Số liệu dashboard tổng hợp từ API theo phạm vi dữ liệu tải được, không giả lập doanh thu hay mức tăng trưởng. Dashboard bếp chỉ tổng hợp các đơn trong hàng đợi bếp.
- Tìm kiếm/lọc/phân trang hiện thực hiện phía client trên danh sách API trả về; chưa dùng phân trang server cho các danh sách này.

Frontend kiểm tra session qua `/users/me`, lưu token trong `sessionStorage` và xóa khi đăng xuất/401. Route/menu chỉ hỗ trợ trải nghiệm; quyền dữ liệu và thao tác vẫn cần backend xác thực. Một số API công khai hiện tại của backend chưa có role guard; việc ẩn nút trong FE không thay thế bảo vệ backend. Lọc cửa hàng ở UI cũng không thay thế phân quyền dữ liệu tại API.

Chưa triển khai POS/tạo hóa đơn, sửa/xóa sản phẩm, công thức, báo cáo doanh thu/hao hụt. Không sửa backend hoặc FranchiseStore trong lần dựng FE này.

## Tạo đơn hàng (STORESTAFF)

Vào **Đơn hàng → Tạo / tiếp tục đơn** (`/orders/new`). Tìm tên sản phẩm, lọc danh mục, phân trang và thêm số lượng vào đơn. Có thể lưu số lượng mới, xóa món, chọn loại đơn Normal/Fast/Express, lưu ghi chú và xác nhận gửi đơn sang Pending. Tổng tiền lấy từ backend theo giá nhập, không dùng giá bán lẻ.

API dùng: `GET /order/check-creating`, `GET /order/:id/details`, `POST /productbatches`, `PUT /productbatches/:productId`, `PUT /order/:id` và `PUT /order/:id/sent-to-pending`. Backend tạo sẵn đơn Creating khi tạo cửa hàng và tự tạo nháp kế tiếp sau khi gửi; FE không gọi POST /order vì endpoint đó không tồn tại. Nếu cửa hàng thiếu nháp, màn hình báo lỗi để quản trị viên kiểm tra dữ liệu.

Các món được lưu ngay sau thao tác thêm/lưu số lượng/xóa; ghi chú và loại đơn lưu khi bấm Lưu nháp hoặc Gửi. Các đơn nháp dùng chung theo cửa hàng. FE kiểm tra ID/trạng thái trước thao tác, khóa nút khi đang gửi và tải lại dữ liệu sau mutation. Backend hiện không cung cấp transaction/version cho toàn bộ luồng; kiểm tra tại FE không bảo đảm loại bỏ hoàn toàn xung đột giữa nhiều người thao tác đồng thời.

Kiểm thử tự động mock HTTP bao phủ DTO, số lượng, quyền route, đơn rỗng, nháp thay đổi, lưu ghi chú thất bại và phản hồi gửi đơn bị mất; chưa thay thế kiểm thử với database thật.

## Git workflow

Repository: https://github.com/DatBongDem/FranchiseFE.git. `main` là nhánh chính; `dev` tích hợp các chức năng đã hoàn tất. Tạo nhánh `feature/<ten-chuc-nang>` từ `dev`, commit và push nhánh chức năng, sau đó merge vào `dev` và push `dev`. Không tự động merge vào `main`.

## Cấu trúc

`src/components` giao diện chung; `pages` các màn hình; `services` HTTP và chuẩn hóa DTO PascalCase/camelCase; `types` kiểu dữ liệu; `hooks` tải dữ liệu; `contexts` session; `routes` kiểm soát đường dẫn theo role; `styles/global.css` theme và responsive; `assets` tài nguyên riêng; `public` favicon.

Google Font có fallback về font hệ thống nếu không truy cập mạng. Ảnh sản phẩm lấy từ API; sản phẩm chưa có ảnh dùng biểu tượng minh họa, không gán ảnh món ăn giả.
