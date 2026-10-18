from contracts.models import AnalysisRequest, AnalysisResult, QualityReport

from .quality import check_image
from .rules_engine import analyze_with_rules


def analyze(request: AnalysisRequest) -> AnalysisResult:
    return analyze_with_rules(request)
