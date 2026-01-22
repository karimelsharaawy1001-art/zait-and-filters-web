export const abandonedCartTemplate = (items, recoveryLink) => {
    const itemsHtml = items.map(item => `
        <div class="item" style="display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee;">
            <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.name}" class="item-image" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; margin-left: 15px;">
            <div class="item-details" style="flex-grow: 1;">
                <div class="item-name" style="font-weight: bold; color: #333; font-size: 16px;">${item.name}</div>
                <div class="item-price" style="color: #008a40; font-weight: bold; margin-top: 5px;">${item.price} ج.م</div>
            </div>
        </div>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نسيت حاجة في سلتك؟</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            direction: rtl;
            text-align: right;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #008a40;
            padding: 20px;
            text-align: center;
        }
        .header img {
            max-width: 150px;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 24px;
            color: #333;
            margin-bottom: 20px;
            font-weight: bold;
        }
        .message {
            font-size: 16px;
            color: #555;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .cart-items {
            border-top: 1px solid #eee;
            margin-bottom: 30px;
        }
        .cta-container {
            text-align: center;
            margin-top: 30px;
        }
        .cta-button {
            background-color: #008a40;
            color: #ffffff !important;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            font-size: 18px;
            display: inline-block;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://zaitandfilters.com/logo.png" alt="ZAIT & FILTERS">
        </div>
        <div class="content">
            <div class="greeting">أهلاً يا بطل! 👋</div>
            <div class="message">
                نسيت حاجة في سلتك؟ القطع دي أصلية وعليها ضغط، كمل شروتك دلوقتي عشان تضمن إنها تفضل محجوزة ليك.
            </div>
            
            <div class="cart-items">
                ${itemsHtml}
            </div>

            <div class="cta-container">
                <a href="${recoveryLink}" class="cta-button">رجوع للسلة وإتمام الشراء</a>
            </div>
        </div>
        <div class="footer">
            &copy; 2026 ZAIT & FILTERS. جميع الحقوق محفوظة.<br>
            إذا لم تكن ترغب في استلام هذه الرسائل، يمكنك إلغاء الاشتراك من هنا.
        </div>
    </div>
</body>
</html>
    `;
};
