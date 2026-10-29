# Pest Training · IPM

Bộ slide đào tạo **Quản lý dịch hại tổng hợp (Integrated Pest Management – IPM)** bằng tiếng Việt, dành cho kho và cơ sở sản xuất thực phẩm. Slide là HTML tĩnh, có **thuyết minh giọng đọc tiếng Việt** khi trình chiếu.

## Nội dung

| # | Module | Slide |
|---|---|---|
| 1 | Nhận thức chung về IPM | 16 |
| 2 | Sinh học các loài dịch hại | 38 |
| 3 | Giám sát dịch hại | 23 |
| 4 | Phòng ngừa tại nhà máy | 25 |
| 5 | Phòng ngừa tại kho & phân phối | 22 |
| 6 | Kiểm soát & tiêu diệt | 22 |

Trang chủ `index.html` có droplist chọn module và khung xem slide. Mỗi module cũng mở được riêng: `slides/0x-....html`.

## Trình chiếu

- `←` `→` / nút Trước – Tiếp, `F` toàn màn hình, `P` phát/tạm dừng thuyết minh; vuốt trên điện thoại.
- Màn hình hẹp (< 640 px) tự chuyển sang dạng cuộn để đọc.
- Thuyết minh: **Google Translate TTS** tiếng Việt (giống khoá QAFood CIP Training), tốc độ mặc định 1,2×, đọc xong tự chuyển slide. Cần Internet; lời đọc được gửi tới Google.
- Lời đọc mặc định lấy từ chữ trên slide (bỏ thuật ngữ tiếng Anh trong ngoặc, đọc viết tắt theo phiên âm). Slide nào cần lời đọc riêng thì thêm `<div class="say">…</div>` trong `<section class="slide">`.

## Cấu trúc

```
index.html          trang chủ: droplist + khung xem
slides/deck.css     giao diện slide dùng chung (16:9, sáng/tối, in)
slides/deck.js      điều hướng, tự co chữ, thuyết minh TTS
slides/0x-*.html    6 module
```

## Xuất bản

GitHub → **Settings → Pages** → Deploy from a branch → `main` / `(root)`.

## Lưu ý

Tài liệu được biên soạn lại, tập trung vào kiến thức chuyên môn. Khi áp dụng cần đối chiếu quy định pháp luật địa phương, nhãn và SDS của hoá chất, và đánh giá rủi ro của từng cơ sở.
