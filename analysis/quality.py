from io import BytesIO

from PIL import Image

from contracts.enums import FlagCode
from contracts.models import QualityReport


def check_image(data: bytes) -> QualityReport:
    with Image.open(BytesIO(data)) as image:
        width, height = image.size
        return QualityReport(
            width=width,
            height=height,
            blur_score=1.0,
            exif_datetime=None,
            flags=[],
        )
