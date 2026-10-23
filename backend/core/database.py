from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

DEFAULT_FAQS = [
    {
        "question": "Что такое кредиты и когда они списываются?",
        "answer": "Кредиты используются для запуска генераций. Стоимость зависит от выбранного инструмента, модели, длительности или разрешения и показывается прямо в интерфейсе до старта задачи.",
    },
    {
        "question": "Что делать, если генерация завершилась с ошибкой?",
        "answer": "Откройте «Мои проекты» и проверьте статус задачи. Если списанные кредиты не вернулись автоматически, обратитесь в поддержку и укажите ID задачи.",
    },
    {
        "question": "Сколько времени занимает генерация?",
        "answer": "Это зависит от выбранного инструмента и текущей нагрузки. Простые операции вроде upscale или remove background обычно завершаются быстрее, а видео, музыка и сложные генерации могут занимать заметно больше времени.",
    },
    {
        "question": "Где посмотреть историю своих генераций?",
        "answer": "Все запущенные задачи и готовые результаты доступны в разделе «Мои проекты». Там можно открыть результат, проверить статус генерации и вернуться к предыдущим работам.",
    },
    {
        "question": "Можно ли использовать полученные результаты в коммерческих проектах?",
        "answer": "Обычно да, но итоговые права и ограничения зависят от конкретного инструмента, исходных материалов и правил провайдера модели. Если задача связана с клиентской или коммерческой работой, лучше дополнительно проверить условия использования и ваши права на исходники.",
    },
    {
        "question": "Как работают подписки, оплата и возвраты?",
        "answer": "Стоимость зависит от выбранного тарифа или пакета кредитов. Правила возврата, условия использования, политика конфиденциальности и политика cookie доступны на отдельных страницах сайта и всегда открываются из футера.",
    },
]

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def run_migrations():
    """Apply incremental schema changes that create_all can't handle."""
    migrations = [
        "ALTER TABLE model_pricing ADD COLUMN category VARCHAR",
        "ALTER TABLE model_pricing ADD COLUMN aspect_ratio VARCHAR",
        "ALTER TABLE model_pricing ADD COLUMN output_format VARCHAR",
        "ALTER TABLE model_pricing ADD COLUMN num_images INTEGER",
        "ALTER TABLE model_pricing ADD COLUMN google_search BOOLEAN",
        "ALTER TABLE model_pricing ADD COLUMN reference_count INTEGER",
        "ALTER TABLE model_pricing ADD COLUMN generation_mode VARCHAR",
        "ALTER TABLE model_pricing ADD COLUMN acceleration VARCHAR",
        "ALTER TABLE model_pricing ADD COLUMN frame_count INTEGER",
        "ALTER TABLE model_pricing ADD COLUMN sound_enabled BOOLEAN",
        "ALTER TABLE model_pricing ADD COLUMN remove_watermark BOOLEAN",
        "ALTER TABLE pricing_plans ADD COLUMN is_recurring BOOLEAN DEFAULT 0",
        "ALTER TABLE pricing_plans ADD COLUMN recurring_days INTEGER DEFAULT 30",
        "ALTER TABLE payment_records ADD COLUMN product_type VARCHAR DEFAULT 'plan'",
        "ALTER TABLE payment_records ADD COLUMN credits_rate_per_100_snapshot FLOAT DEFAULT 0",
        "ALTER TABLE users ADD COLUMN display_name VARCHAR",
        "ALTER TABLE users ADD COLUMN avatar_url VARCHAR",
        "ALTER TABLE users ADD COLUMN utm_code VARCHAR",
        "ALTER TABLE users ADD COLUMN utm_source VARCHAR",
        "ALTER TABLE users ADD COLUMN utm_medium VARCHAR",
        "ALTER TABLE users ADD COLUMN utm_campaign VARCHAR",
        "ALTER TABLE users ADD COLUMN utm_link_id INTEGER",
        "ALTER TABLE users ADD COLUMN utm_attributed_at DATETIME",
        "ALTER TABLE users ADD COLUMN moderation_notice VARCHAR",
        "ALTER TABLE users ADD COLUMN moderation_required BOOLEAN DEFAULT 0",
        "ALTER TABLE utm_tracking_links ADD COLUMN note TEXT",
        "ALTER TABLE tasks ADD COLUMN provider_status VARCHAR",
        "ALTER TABLE tasks ADD COLUMN prompt TEXT",
        "ALTER TABLE tasks ADD COLUMN error_message TEXT",
        "ALTER TABLE tasks ADD COLUMN error_details TEXT",
        "ALTER TABLE tasks ADD COLUMN settings_snapshot_json TEXT",
        "ALTER TABLE tasks ADD COLUMN view_count INTEGER DEFAULT 0",
        "ALTER TABLE tasks ADD COLUMN started_at DATETIME",
        "ALTER TABLE tasks ADD COLUMN completed_at DATETIME",
        "ALTER TABLE tasks ADD COLUMN credits_refunded_at DATETIME",
        "ALTER TABLE tasks ADD COLUMN credits_refund_reason VARCHAR",
        """
        CREATE TABLE IF NOT EXISTS user_notifications (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            task_id INTEGER NULL,
            kind VARCHAR NOT NULL,
            title VARCHAR NULL,
            message TEXT NULL,
            metadata_json TEXT NULL,
            is_read BOOLEAN DEFAULT 0,
            read_at DATETIME NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users (id),
            FOREIGN KEY(task_id) REFERENCES tasks (id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS oauth_accounts (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            provider VARCHAR NOT NULL,
            provider_subject VARCHAR NOT NULL,
            email VARCHAR NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users (id)
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_admin_logs_created_at ON admin_logs (created_at)",
        "CREATE INDEX IF NOT EXISTS ix_admin_logs_scope ON admin_logs (scope)",
        "CREATE INDEX IF NOT EXISTS ix_admin_logs_level ON admin_logs (level)",
        "CREATE INDEX IF NOT EXISTS ix_admin_logs_task_id ON admin_logs (task_id)",
        "CREATE INDEX IF NOT EXISTS ix_users_utm_code ON users (utm_code)",
        "CREATE INDEX IF NOT EXISTS ix_users_utm_link_id ON users (utm_link_id)",
        "CREATE INDEX IF NOT EXISTS ix_user_notifications_user_id ON user_notifications (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_user_notifications_task_id ON user_notifications (task_id)",
        "CREATE INDEX IF NOT EXISTS ix_user_notifications_kind ON user_notifications (kind)",
        "CREATE INDEX IF NOT EXISTS ix_user_notifications_is_read ON user_notifications (is_read)",
        "CREATE INDEX IF NOT EXISTS ix_user_notifications_created_at ON user_notifications (created_at)",
        "CREATE INDEX IF NOT EXISTS ix_oauth_accounts_user_id ON oauth_accounts (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_oauth_accounts_provider ON oauth_accounts (provider)",
        "CREATE INDEX IF NOT EXISTS ix_oauth_accounts_provider_subject ON oauth_accounts (provider_subject)",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_oauth_accounts_provider_subject ON oauth_accounts (provider, provider_subject)",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # Column already exists or table not yet created

        try:
            plans_count = conn.execute(text("SELECT COUNT(*) FROM pricing_plans WHERE is_active = 1")).scalar() or 0
            if plans_count == 0:
                conn.execute(
                    text(
                        """
                        INSERT INTO pricing_plans (
                            name_ru, name_en,
                            description_ru, description_en,
                            badge_ru, badge_en,
                            billing_period_ru, billing_period_en,
                            cta_label_ru, cta_label_en,
                            cta_url,
                            features_ru, features_en,
                            currency_symbol, price, credits,
                            is_recurring, recurring_days,
                            is_featured, is_active, sort_order
                        ) VALUES
                        (
                            'Pro',
                            'Pro',
                            'Тестовый платный план для клиентской проверки оплаты и автопродления.',
                            'Test paid plan for client-side checkout and recurring payment verification.',
                            'Популярный',
                            'Popular',
                            '/ месяц',
                            '/ month',
                            'Купить Pro',
                            'Buy Pro',
                            '/pricing',
                            '1200 кредитов\nАвтопродление\nПриоритетная генерация\nВсе ИИ-инструменты',
                            '1200 credits\nAuto renewal\nPriority generations\nAll AI tools',
                            '₽',
                            990,
                            1200,
                            1,
                            30,
                            1,
                            1,
                            10
                        ),
                        (
                            'Ultra',
                            'Ultra',
                            'Расширенный тестовый план с большим лимитом кредитов для проверки подписки.',
                            'Extended test plan with a higher credit bundle for subscription testing.',
                            'Максимум',
                            'Maximum',
                            '/ месяц',
                            '/ month',
                            'Купить Ultra',
                            'Buy Ultra',
                            '/pricing',
                            '3500 кредитов\nАвтопродление\nМаксимальный лимит\nВсе ИИ-инструменты',
                            '3500 credits\nAuto renewal\nMaximum limits\nAll AI tools',
                            '₽',
                            2490,
                            3500,
                            1,
                            30,
                            0,
                            1,
                            20
                        )
                        """
                    )
                )
                conn.commit()
        except Exception:
            pass

        try:
            conn.execute(
                text(
                    """
                    UPDATE faqs
                    SET answer = :new_answer
                    WHERE question = :question
                      AND answer = :old_answer
                    """
                ),
                {
                    "question": "Как работают подписки, оплата и возвраты?",
                    "old_answer": "Оплата и тарифы зависят от выбранного плана или пакета кредитов. Условия возврата, cookies, privacy и terms опубликованы на отдельных правовых страницах сайта и доступны из футера.",
                    "new_answer": "Стоимость зависит от выбранного тарифа или пакета кредитов. Правила возврата, условия использования, политика конфиденциальности и политика cookie доступны на отдельных страницах сайта и всегда открываются из футера.",
                },
            )
            conn.commit()
        except Exception:
            pass

        try:
            faq_count = conn.execute(text("SELECT COUNT(*) FROM faqs")).scalar() or 0
            placeholder_count = conn.execute(
                text(
                    """
                    SELECT COUNT(*) FROM faqs
                    WHERE TRIM(LOWER(question)) IN ('qq', 'ss', 'faq', 'test')
                      AND TRIM(LOWER(answer)) IN ('qq', 'ss', 'faq', 'test')
                    """
                )
            ).scalar() or 0

            should_seed_faqs = faq_count == 0 or (faq_count > 0 and faq_count == placeholder_count)
            if should_seed_faqs:
                conn.execute(text("DELETE FROM faqs"))
                for index, item in enumerate(DEFAULT_FAQS):
                    conn.execute(
                        text(
                            """
                            INSERT INTO faqs (question, answer, is_active, order_index)
                            VALUES (:question, :answer, 1, :order_index)
                            """
                        ),
                        {
                            "question": item["question"],
                            "answer": item["answer"],
                            "order_index": index,
                        },
                    )
                conn.commit()
        except Exception:
            pass
