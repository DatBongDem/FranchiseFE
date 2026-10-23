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
| STORESTAFF        | Dashboard cửa hàng, sản phẩm, tạo đơn nhập, tạo/xem/in hóa đơn bán hàng                        |
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

Chưa triển khai sửa/xóa sản phẩm và công thức. Không sửa backend hoặc FranchiseStore trong lần dựng FE này.

## Tạo đơn hàng (STORESTAFF)

Vào **Đơn hàng → Tạo / tiếp tục đơn** (`/orders/new`). Tìm tên sản phẩm, lọc danh mục, phân trang và thêm số lượng vào đơn. Có thể lưu số lượng mới, xóa món, chọn loại đơn Normal/Fast/Express, lưu ghi chú và xác nhận gửi đơn sang Pending. Tổng tiền lấy từ backend theo giá nhập, không dùng giá bán lẻ.

API dùng: `GET /order/check-creating`, `GET /order/:id/details`, `POST /productbatches`, `PUT /productbatches/:productId`, `PUT /order/:id` và `PUT /order/:id/sent-to-pending`. Backend tạo sẵn đơn Creating khi tạo cửa hàng và tự tạo nháp kế tiếp sau khi gửi; FE không gọi POST /order vì endpoint đó không tồn tại. Nếu cửa hàng thiếu nháp, màn hình báo lỗi để quản trị viên kiểm tra dữ liệu.

Các món được lưu ngay sau thao tác thêm/lưu số lượng/xóa; ghi chú và loại đơn lưu khi bấm Lưu nháp hoặc Gửi. Các đơn nháp dùng chung theo cửa hàng. FE kiểm tra ID/trạng thái trước thao tác, khóa nút khi đang gửi và tải lại dữ liệu sau mutation. Backend hiện không cung cấp transaction/version cho toàn bộ luồng; kiểm tra tại FE không bảo đảm loại bỏ hoàn toàn xung đột giữa nhiều người thao tác đồng thời.

Kiểm thử tự động mock HTTP bao phủ DTO, số lượng, quyền route, đơn rỗng, nháp thay đổi, lưu ghi chú thất bại và phản hồi gửi đơn bị mất; chưa thay thế kiểm thử với database thật.

## Tạo hóa đơn bán hàng (STORESTAFF)

Vào **Bán hàng / Hóa đơn** (`/bills`) hoặc nút bán hàng trên dashboard. Tìm tên, lọc danh mục/còn hàng, phân trang sản phẩm; thêm món, nhập số lượng, xóa món, ghi chú rồi xác nhận tạo hóa đơn. Giá tạm tính dùng `SellingPrice || Price || 0` giống backend; API quyết định giá trị chính thức và trừ kho theo các lô còn hạn thuộc đơn Completed của cửa hàng.

API: `GET /product`, `GET /productbatches/:storeId/inventory`, `POST /bills` với `{items: [{productId, quantity}], note}`, `GET /bills/:id/print`, `GET /bills/history?pageNumber=&pageSize=`. FE không gửi đơn giá/tổng tiền/cửa hàng hoặc nhân viên trong payload tạo hóa đơn; backend lấy thông tin từ token. Lịch sử cá nhân phân trang phía server. Bản in dùng tổng tiền và các dòng thực tế từ backend, giữ các dòng tách theo lô FIFO.

Nút tạo bị khóa trong lúc gửi. Trạng thái gửi/mã hóa đơn được lưu trong `sessionStorage` theo tài khoản và cửa hàng. Lỗi tồn kho 422 giữ giỏ để sửa. Mất phản hồi POST/HTTP 5xx/kết quả thiếu BillId được coi là chưa xác định: không tự retry, yêu cầu đối chiếu lịch sử trước khi bắt đầu giao dịch mới. Lỗi tải bản in chỉ tải lại bản in. Cơ chế FE này không thay thế idempotency phía backend và không đồng bộ giữa các tab; giỏ chưa gửi không lưu khi đổi trang.

Kiểm thử mock HTTP bao phủ quyền, kho, validation số lượng, payload, phản hồi PascalCase, lỗi tạo/in, phân trang và trạng thái phục hồi. Chưa kiểm thử với SQL Server thật hoặc máy in thực tế. Không bổ sung API thanh toán, giảm giá hay VAT vì backend hiện chưa cung cấp.

## Doanh thu cửa hàng (MANAGER)

Vào **Doanh thu cửa hàng** (`/revenue`) hoặc nút báo cáo trên dashboard quản lý. Chọn từ ngày/đến ngày hoặc Hôm nay, 7 ngày gần đây, Tháng này; bấm Xem báo cáo. Mặc định từ đầu tháng đến hôm nay theo lịch Việt Nam. API nhận `date` và `endDate` dưới dạng `YYYY-MM-DD`, giữ nguyên ngày do người dùng chọn; backend quyết định ranh giới truy vấn theo semantics hiện tại, gồm cả ngày kết thúc.

Gọi `GET /bills/stores/:storeId/revenue?date=&endDate=` với cửa hàng từ tài khoản. Mặc dù route backend liệt kê nhiều role, service thực tế chỉ cho MANAGER đúng cửa hàng; FE theo quyền này. Báo cáo có tổng doanh thu, giá vốn, lợi nhuận gộp, số sản phẩm phát sinh; Top 5 doanh thu theo sản phẩm; bảng tìm tên có/không dấu, sắp xếp và phân trang client. Bộ lọc tên chỉ ảnh hưởng bảng, không đổi tổng quan/biểu đồ của kỳ.

Số tiền lấy từ `data.summary` và `data.items`; không tự tạo chuỗi doanh thu ngày từ `saleDate` vì backend tổng hợp theo sản phẩm cho cả kỳ. Lợi nhuận âm được giữ nguyên, biên lợi nhuận khi doanh thu bằng 0 hiển thị `—`. Lợi nhuận này là lãi gộp, không phải lãi ròng; giá vốn được backend tính theo giá sản phẩm hiện tại. Trạng thái trống/lỗi/quyền truy cập được hiển thị riêng, không biến lỗi API thành doanh thu 0.

Kiểm thử mock HTTP bao phủ quyền, cửa hàng, ngày nhuận, khoảng ngày, múi giờ preset, decimal/lợi nhuận âm, dữ liệu trống/sai cấu trúc, tìm kiếm và sắp xếp. Chưa kiểm thử tích hợp với SQL Server thật.

## Hao hụt cửa hàng (MANAGER)

Vào **Hao hụt cửa hàng** (`/shrinkage`). FE gọi `GET /productbatches/:storeId/shrinkage` với cửa hàng được gán cho tài khoản quản lý; không cho các role khác mở trang. Hiển thị số lượng hết hạn, giá trị thiệt hại, số sản phẩm khác nhau và số nhóm sản phẩm/ngày hết hạn tại thời điểm `calculatedAt` do backend trả về.

Bộ lọc tên có/không dấu, từ/đến ngày hết hạn (có thể bỏ trống một hoặc cả hai mốc), sắp xếp và phân trang đều chạy phía client vì endpoint chưa hỗ trợ tham số lọc. Lọc giữ nguyên tổng toàn cửa hàng, đồng thời hiển thị tổng số lượng/thiệt hại của kết quả lọc. Top 5 gộp các ngày hết hạn theo ProductId trước khi xếp hạng. Ngày SQL được giữ nguyên ngày lịch, không đổi qua múi giờ trình duyệt.

Đây là ảnh chụp số lượng còn lại đã hết hạn, không phải lịch sử các lần tiêu hủy; không có thao tác trừ kho. Giá trị thiệt hại tính theo giá vốn sản phẩm hiện tại từ backend, tổng số lượng chưa quy đổi đơn vị. Dữ liệu trống, không có kết quả lọc, lỗi API và lỗi quyền được hiển thị riêng.

Kiểm thử mock HTTP bao phủ quyền/cửa hàng, DTO/decimal, dữ liệu sai, ngày hết hạn, bộ lọc hai biên, sắp xếp, tổng theo bộ lọc và gộp sản phẩm qua nhiều ngày. Chưa kiểm thử tích hợp SQL Server thật.

## Git workflow

Repository: https://github.com/DatBongDem/FranchiseFE.git. `main` là nhánh chính; `dev` tích hợp các chức năng đã hoàn tất. Tạo nhánh `feature/<ten-chuc-nang>` từ `dev`, commit và push nhánh chức năng, sau đó merge vào `dev` và push `dev`. Không tự động merge vào `main`.

## Cấu trúc

`src/components` giao diện chung; `pages` các màn hình; `services` HTTP và chuẩn hóa DTO PascalCase/camelCase; `types` kiểu dữ liệu; `hooks` tải dữ liệu; `contexts` session; `routes` kiểm soát đường dẫn theo role; `styles/global.css` theme và responsive; `assets` tài nguyên riêng; `public` favicon.

Google Font có fallback về font hệ thống nếu không truy cập mạng. Ảnh sản phẩm lấy từ API; sản phẩm chưa có ảnh dùng biểu tượng minh họa, không gán ảnh món ăn giả.

## Lịch sử hóa đơn cửa hàng (MANAGER)

- Trang `/store-bills` gọi `GET /bills/billingHistory/{storeId}` với cửa hàng được phân công.
- Lọc ngày từ/đến tùy chọn; gửi trọn ngày theo UTC+7. Phân trang server 6/12/24 hóa đơn, mới nhất trước.
- Tìm mã hóa đơn hoặc tên sản phẩm có/không dấu trong trang hiện tại; không tìm trên các trang chưa tải.
- Xem chi tiết trực tiếp từ API lịch sử, giữ các dòng theo lô hàng. Tổng tiền trang được phân biệt với tổng số hóa đơn trong khoảng ngày.
- Có trạng thái đang tải, lỗi/thử lại và không có dữ liệu. Kiểm thử dùng API mô phỏng; chưa xác nhận database thực.

## Hủy đơn hàng

- Nút Hủy đơn trong danh sách đơn hàng/bếp/điều phối gọi `PUT /order/{id}/cancel` với `cancellationReason` tùy chọn.
- Xác nhận mã đơn, trạng thái, giá trị và lý do trước khi hủy. Chặn đơn Completed/Canceled; MANAGER/STORESTAFF chỉ thao tác cửa hàng được phân công.
- Kiểm tra lại danh sách trước khi gửi. Khóa gửi trùng trong hộp thoại; nếu phản hồi lỗi hoặc không hợp lệ, đọc lại trạng thái, không tự gửi lại PUT.
- API có thể lưu hủy rồi trả lỗi (ví dụ đơn nháp thiếu UserId). Nếu chưa xác nhận được kết quả, yêu cầu đóng và tải lại trước khi tiếp tục. Hủy đơn nháp không tự tạo nháp thay thế.
- Quyền của endpoint hiện là mọi tài khoản đã đăng nhập; FE không thay thế kiểm tra quyền ở backend. Không thay đổi backend trong chức năng này.

## Cập nhật công thức

- Trang `/recipes` dành cho ADMIN và KITCHENSTAFF: danh sách, tìm tên sản phẩm/mô tả có hoặc không dấu, phân trang.
- Gọi `GET /recipe`, `GET /recipe/{id}/with-ingredients`, `PUT /recipe/{id}`. Danh sách chỉ trả metadata; luôn tải chi tiết trước khi chỉnh sửa.
- Giữ nguyên sản phẩm; sửa mô tả và thay toàn bộ danh sách nguyên liệu. FE kiểm tra nguyên liệu trong danh mục, không trùng, định lượng dương tối đa hai chữ số thập phân. Bỏ hết nguyên liệu cần đánh dấu xác nhận.
- Đọc lại trước khi lưu để phát hiện thay đổi từ phiên khác, đọc lại sau khi lưu để xác nhận. Đây không phải khóa đồng thời ở server. Nếu lưu lỗi, khóa gửi lại trong form và yêu cầu mở lại vì API có thể đã lưu mô tả/xóa nguyên liệu trước khi thêm dòng mới thất bại.
- Backend hiện chưa phân quyền route công thức; giới hạn ADMIN/KITCHENSTAFF là quy tắc giao diện. Không thay đổi backend trong chức năng này. Kiểm thử dùng API mô phỏng, chưa kiểm tra database thực.

## Xóa công thức

- ADMIN/KITCHENSTAFF chọn Xóa tại trang Công thức, xem mô tả/số dòng nguyên liệu và đánh dấu xác nhận.
- Đọc chi tiết mới nhất trước `DELETE /recipe/{id}` để phát hiện thay đổi từ phiên khác. Kiểm tra công thức đã biến mất khỏi danh sách trước khi báo thành công.
- Khóa bấm lặp; không tự gửi lại DELETE khi lỗi mạng/server. Nếu chưa xác nhận kết quả, đóng và tải lại để kiểm tra. Không thay đổi backend hoặc FranchiseStore.

## Xác nhận nhận hàng / hoàn thành đơn

- STORESTAFF chọn Xác nhận nhận hàng trên đơn Arrived thuộc cửa hàng được phân công. Hộp thoại tải chi tiết sản phẩm, số lượng đặt và tổng giá trị để đối chiếu hàng thực nhận.
- Đánh dấu đã kiểm tra, nhập phản hồi tùy chọn, gọi `PUT /order/{id}/complete` với `{ feedback }`.
- Đọc lại chi tiết trước khi gửi và kiểm tra trạng thái Completed sau khi gửi; chống bấm lặp, không tự gửi lại nếu mất kết nối. Nếu chưa xác nhận kết quả, đóng và tải lại danh sách.
- Phạm vi cửa hàng được kiểm tra ở FE; backend hiện kiểm tra role và trạng thái, chưa kiểm tra quyền sở hữu cửa hàng tại endpoint complete. Chức năng này không thay đổi backend.
- Kiểm thử API mô phỏng, chưa xác nhận luồng nhận hàng với database thực.

## Lịch sử đơn hàng theo cửa hàng

- MANAGER mở `/store-orders`, gọi `GET /order/order-history/{storeId}` với cửa hàng được phân công. Quyền MANAGER theo kiểm tra thực tế trong service backend.
- Lọc ngày gửi đơn theo UTC+7, phân trang server 6/12/24. Không chọn ngày sẽ bao gồm đơn chưa gửi nếu API trả về; createdTime của DTO là SentTime, không phải ngày tạo đơn.
- Xem trạng thái, mã người gửi, sản phẩm theo lô, số lượng đặt và đơn giá; tổng tiền hiển thị theo trang, không phải tổng toàn cửa hàng. Tìm mã/tên sản phẩm trong trang hiện tại, hỗ trợ không dấu.
- API mô phỏng được kiểm thử; chưa xác nhận dữ liệu lịch sử thực hoặc dữ liệu chuyển từ C# có quy ước múi giờ khác. Không thay đổi backend/FranchiseStore.

## Tạo công thức

- ADMIN/KITCHENSTAFF chọn Tạo công thức, chọn sản phẩm chưa có công thức, nhập hướng dẫn và ít nhất một nguyên liệu. Định lượng dương tối đa hai chữ số thập phân, không trùng nguyên liệu.
- Kiểm tra lại danh sách trước `POST /recipe`; đọc lại danh sách và chi tiết sau khi tạo để xác minh vì phản hồi POST không chứa recipeID mới.
- Chống bấm lặp, không tự gửi lại khi lỗi mạng/server. Nếu tạo dở, đóng form, tải lại và dùng cập nhật công thức để kiểm tra/bổ sung.
- Kiểm thử bằng API mô phỏng; chưa kiểm tra database thực. Không chỉnh sửa hoặc push FranchiseStore.
