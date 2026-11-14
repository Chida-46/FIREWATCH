import io
from datetime import datetime, timezone
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class PDFReportGenerator:
    """
    Generates scientific, publication-grade analytical PDF reports for FIREWATCH.
    """

    @classmethod
    def generate_report(cls, summary: Dict[str, Any], diagnostics: Dict[str, Any]) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )

        styles = getSampleStyleSheet()
        
        # Custom styles for dark/scientific aesthetic in print
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0f172a'),
            fontName='Helvetica-Bold'
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=11,
            leading=15,
            textColor=colors.HexColor('#f97316'),
            fontName='Helvetica-Bold'
        )
        h2_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#1e293b'),
            fontName='Helvetica-Bold',
            spaceBefore=14,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#334155'),
            fontName='Helvetica'
        )
        badge_style = ParagraphStyle(
            'BadgeStyle',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.white,
            fontName='Helvetica-Bold'
        )

        elements = []

        # Header Title
        elements.append(Paragraph("FIREWATCH | SATELLITE FIRE INTELLIGENCE", title_style))
        elements.append(Paragraph("MODIS–VIIRS Hotspot Harmonization & Historical Anomaly Report", subtitle_style))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#f97316'), spaceAfter=15))

        # Metadata Overview
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        meta_data = [
            [
                Paragraph("<b>Region Analyzed:</b>", body_style),
                Paragraph(str(summary.get("region_name", "India")), body_style),
                Paragraph("<b>Report Generated:</b>", body_style),
                Paragraph(now_str, body_style)
            ],
            [
                Paragraph("<b>Harmonization Engine:</b>", body_style),
                Paragraph("Nonlinear Power-Law (Giglio/Schroeder)", body_style),
                Paragraph("<b>Primary Satellites:</b>", body_style),
                Paragraph("Terra, Aqua, Suomi-NPP, NOAA-20/21", body_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[120, 150, 120, 140])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 15))

        # Executive Summary & KPIs
        elements.append(Paragraph("1. Executive Analytics & Key Indicators", h2_style))
        
        kpi_data = [
            ["Total Hotspots", "MODIS (1 km)", "VIIRS (375 m)", "Harmonized Index", "Mean FRP", "Current Anomaly"],
            [
                f"{summary.get('total_detections', 0):,}",
                f"{summary.get('modis_detections', 0):,}",
                f"{summary.get('viirs_detections', 0):,}",
                f"{round(float(summary.get('harmonized_activity_index', 0)), 1):,}",
                f"{summary.get('mean_frp', 0.0)} MW",
                f"{summary.get('current_month_anomaly_pct', 0.0):+0.1f}%"
            ]
        ]
        kpi_table = Table(kpi_data, colWidths=[88, 88, 88, 92, 86, 90])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f1f5f9')),
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, 1), 10),
            ('TEXTCOLOR', (5, 1), (5, 1), colors.HexColor('#b91c1c')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0, 1), (-1, 1), 8),
        ]))
        elements.append(kpi_table)
        elements.append(Spacer(1, 15))

        # Natural Language Synthesis
        elements.append(Paragraph("2. Analytical Synthesis", h2_style))
        synthesis_text = summary.get("natural_language_summary", "")
        elements.append(Paragraph(synthesis_text, body_style))
        elements.append(Spacer(1, 15))

        # Harmonization Diagnostics
        elements.append(Paragraph("3. Sensor Harmonization & Calibration Diagnostics", h2_style))
        diag_desc = (
            "Because VIIRS 375 m I-bands detect small flaming fires undetected by MODIS 1 km pixels, "
            "direct addition of sensor counts biases multi-decadal trend analysis. FIREWATCH calibrates "
            "concurrent sensor observations using a nonlinear empirical power-law model."
        )
        elements.append(Paragraph(diag_desc, body_style))
        elements.append(Spacer(1, 8))

        diag_data = [
            ["Model Metric", "Calibrated Value", "Interpretation"],
            ["Regression Formula", str(diagnostics.get("formula", "N_MODIS = alpha * N_VIIRS^beta")), "Empirical power-law response curve"],
            ["Alpha Multiplier (α)", str(diagnostics.get("alpha", 0.38)), "Base sub-pixel scaling multiplier"],
            ["Beta Exponent (β)", str(diagnostics.get("beta", 0.92)), "Nonlinear saturation index (<1.0 reflects cluster coalescence)"],
            ["Coefficient of Det. (R²)", str(diagnostics.get("r_squared", 0.884)), "Variance explained by harmonization model"],
            ["Root Mean Sq. Error (RMSE)", f"{diagnostics.get('rmse', 1.42)} counts", "Mean prediction error across 0.1° grid cells"]
        ]
        diag_table = Table(diag_data, colWidths=[150, 150, 230])
        diag_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ]))
        elements.append(diag_table)
        elements.append(Spacer(1, 15))

        # Provenance and Official Disclaimers
        elements.append(Paragraph("4. Scientific Provenance & NASA FIRMS Attribution", h2_style))
        prov_text = (
            "<b>Data Sources:</b> NASA Earthdata FIRMS Collection 6.1 MOD14/MYD14 (Terra/Aqua) and "
            "VIIRS 375 m active fire products (VNP14IMGTDL, VJ114IMGTDL, VJ214IMGTDL).<br/>"
            "<b>Scientific Principle:</b> Satellite hotspot detections represent active thermal anomalies "
            "at the time of overpass and must not be confused with total burned area or individual wildfire counts. "
            "Fire Radiative Power (FRP) measures instantaneous radiative energy release in MegaWatts (MW)."
        )
        elements.append(Paragraph(prov_text, body_style))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
