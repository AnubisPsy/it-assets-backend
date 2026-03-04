process.on("uncaughtException", (err) => {
  console.error("Error no manejado:", err.message);
});

const PDFDocument = require("pdfkit");
const path = require("path");
const { pool, poolConnect, sql } = require("../config/database");

const generarConstancia = async (req, res) => {
  try {
    await poolConnect;
    const { id } = req.params;

    const result = await pool.request().input("id", sql.Int, id).query(`
        SELECT 
            a.*,
            p.nombre AS persona_nombre,
            p.numero_identidad,
            p.departamento,
            e.marca,
            e.modelo,
            e.serie,
            e.procesador,
            e.ram,
            e.descripcion AS equipo_descripcion
        FROM asignaciones a
        JOIN personas p ON a.persona_id = p.id
        JOIN equipos e ON a.equipo_id = e.id
        WHERE a.id = @id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Asignación no encontrada" });
    }

    const datos = result.recordset[0];
    const fecha = new Date(datos.fecha_asignacion);
    const dia = fecha.getDate();
    const mes = fecha.toLocaleString("es-HN", { month: "long" }).toUpperCase();
    const anio = fecha.getFullYear();

    await pool
      .request()
      .input("id", sql.Int, id)
      .query(
        `UPDATE asignaciones SET pdf_generado = 'generado' WHERE id = @id`,
      );

    const doc = new PDFDocument({ margin: 0, size: "LETTER" });

    res.setHeader("Content-Type", "application/pdf");
    const nombreLimpio = datos.persona_nombre.replace(/\s+/g, "_");
    const fechaLimpia = `${dia}-${mes}-${anio}`;
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=constancia_${nombreLimpio}_${fechaLimpia}.pdf`,
    );
    doc.pipe(res);

    doc.on("error", (err) => console.error("Error en PDF:", err.message));
    res.on("error", (err) => console.error("Error en respuesta:", err.message));

    const margen = 60;
    const anchoUtil = 492; // 612 - 60*2
    let y = 40;

    // ── Logo
    const logoPath = path.join(__dirname, "../assets/MADEYSO_LOGO.png");
    doc.image(logoPath, margen, y, { width: 150 });

    // ── Fecha (derecha, mismo nivel que logo)
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        `La Ceiba, Atlántida   Fecha ${dia} de ${mes} de ${anio}`,
        margen,
        y + 20,
        { width: anchoUtil, align: "right" },
      );

    y = 120;

    // ── Título
    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("CONSTANCIA DE ENTREGA DE EQUIPO", margen, y, {
        width: anchoUtil,
        align: "center",
      });

    y = 160;

    // ── Datos del colaborador
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Yo, ", margen, y, { continued: true })
      .font("Helvetica-Bold")
      .text(datos.persona_nombre, { continued: true })
      .font("Helvetica")
      .text(" con número de Identidad  ", { continued: true })
      .font("Helvetica-Bold")
      .text(datos.numero_identidad);

    y = 195;

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        "Por este medio hago constar que en esta fecha he recibido el siguiente equipo:",
        margen,
        y,
        { width: anchoUtil },
      );

    y = 225;

    // ── Tabla
    const col1 = margen;
    const col2 = margen + 160;
    const tableWidth = anchoUtil;
    const rowHeight = 28;

    const filas = [
      ["MARCA:", datos.marca],
      ["MODELO:", datos.modelo],
      ["SERIE:", datos.serie],
      [
        "DESCRIPCIÓN:",
        datos.equipo_descripcion ||
          `Laptop con procesador ${datos.procesador || ""} y ${datos.ram || ""} de RAM`,
      ],
    ];

    filas.forEach((fila, i) => {
      const fy = y + i * rowHeight;
      doc.rect(col1, fy, tableWidth, rowHeight).stroke();
      doc.rect(col1, fy, 160, rowHeight).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(fila[0], col1 + 6, fy + 9, { width: 148 });
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(fila[1] || "—", col2 + 6, fy + 9, { width: tableWidth - 166 });
    });

    // ── Fila de nota
    const notaY = y + filas.length * rowHeight;
    const notaAltura = 55;
    doc.rect(col1, notaY, tableWidth, notaAltura).stroke();
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(
        `Se entrega ${datos.marca} modelo ${datos.modelo} con número de serie ${datos.serie}` +
          (datos.procesador ? ` con procesador ${datos.procesador}` : "") +
          (datos.ram ? ` con ${datos.ram} de RAM` : "") +
          ` en buen estado con su respectivo cargador`,
        col1 + 6,
        notaY + 8,
        { width: tableWidth - 12 },
      );

    // ── Cuerpo del texto
    const cuerpoY = notaY + notaAltura + 35;
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        "Soy consciente que soy responsable del cuidado y resguardo del equipo detallado y que " +
          "me es entregado para fines estrictamente laborales, por lo cual me comprometo a utilizarlo " +
          "única y exclusivamente para realizar mis funciones diarias. De igual manera siendo que soy " +
          "responsable de su guarda y custodia soy consciente que cualquier daño que el equipo sufra " +
          "producto de mi negligencia o descuido será cargado el importe económico en que la empresa " +
          "incurra por su reparación o reemplazo.",
        margen,
        cuerpoY,
        { align: "justify", lineGap: 2, width: anchoUtil },
      );

    // ── Firmas
    const firmaY = cuerpoY + 180;
    const firma1X = margen;
    const firma2X = 340;
    const firmaWidth = 175;

    doc
      .moveTo(firma1X, firmaY)
      .lineTo(firma1X + firmaWidth, firmaY)
      .stroke();
    doc
      .moveTo(firma2X, firmaY)
      .lineTo(firma2X + firmaWidth, firmaY)
      .stroke();

    doc
      .fontSize(9)
      .font("Helvetica")
      .text("Firma del Colaborador que recibe el equipo", firma1X, firmaY + 6, {
        width: firmaWidth,
        align: "center",
      });
    doc.text("Firma del Jefe Inmediato", firma2X, firmaY + 6, {
      width: firmaWidth,
      align: "center",
    });

    doc.end();
  } catch (err) {
    console.error("Error generando PDF:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = { generarConstancia };
