import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from core.config import settings

logger = logging.getLogger(__name__)


def send_html_email(recipient: str, subject: str, html: str) -> bool:
    if not settings.SMTP_EMAIL or not settings.SMTP_PASSWORD:
        logger.info("[DEV] Email is not configured for %s: %s", recipient, subject)
        return False

    message = MIMEMultipart()
    message["From"] = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_EMAIL))
    message["To"] = recipient
    message["Subject"] = subject
    message.attach(MIMEText(html, "html"))

    if settings.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_EMAIL, recipient, message.as_string())
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_EMAIL, recipient, message.as_string())

    return True
