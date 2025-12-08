import pandas as pd

# خطة أسبوعية مفصلة (Gantt) لمدة 16 أسبوع (4 شهور)
weeks = list(range(1, 17))

tasks = [
    "إعداد البنية: ERD نهائي + repo + CI/CD + Mongo Atlas + S3",
    "المصادقة (Auth) + Roles + JWT",
    "Onboarding الشركات + تخصيص subdomain/slug + خطط الدفع",
    "لوحة تحكم الشركة (إعدادات، شعار، سياسات)",
    "الأقسام + التصنيفات + CRUD المنتجات + رفع صور",
    "عربة التسوق + نموذج الطلب + checkout flow",
    "دمج الدفع (Stripe أساسي) + webhooks",
    "نظام الحجز (basic booking API + منع التضارب)",
    "لوحة تحكم الطلبات + الحجوزات للشركات",
    "وضع المتجر (Store mode) + التنقل بين الشركات",
    "البحث والتصفية (global + داخل المتجر)",
    "لوحة تحكم الأدمن (إدارة الشركات + الفواتير)",
    "التنبيهات والإيميلات + إحصائيات أساسية",
    "التجارب والاختبارات (Unit + Integration)",
    "تحسين الواجهة الأمامية + دعم RTL + responsive",
    "النشر + مراقبة + توثيق + buffer للإصلاحات"
]

# توزيع المهام أسبوعياً
week_plan = {
    1: [tasks[0]],
    2: [tasks[1]],
    3: [tasks[2]],
    4: [tasks[3]],
    5: [tasks[4]],
    6: [tasks[5]],
    7: [tasks[6]],
    8: [tasks[7]],
    9: [tasks[8]],
    10: [tasks[9]],
    11: [tasks[10]],
    12: [tasks[11]],
    13: [tasks[12]],
    14: [tasks[13]],
    15: [tasks[14]],
    16: [tasks[15]],
}

# تجهيز DataFrame للـ Gantt
data = []
for week, wk_tasks in week_plan.items():
    for t in wk_tasks:
        data.append({"الأسبوع": week, "المهمة": t})

df = pd.DataFrame(data)

# تجهيز خطة يومية (5 أيام عمل لكل أسبوع)
daily_plan = []
for week in range(1, 17):
    wk_tasks = week_plan[week]
    for task in wk_tasks:
        for day in range(1, 6):
            daily_plan.append({
                "الأسبوع": week,
                "اليوم": f"Day {day}",
                "المهمة": task
            })

df_daily = pd.DataFrame(daily_plan)

# حفظ ملفات CSV
df.to_csv("/mnt/data/Gantt_Weekly.csv", index=False, encoding="utf-8-sig")
df_daily.to_csv("/mnt/data/Daily_Plan.csv", index=False, encoding="utf-8-sig")

import caas_jupyter_tools
caas_jupyter_tools.display_dataframe_to_user("الخطة الأسبوعية", df)
