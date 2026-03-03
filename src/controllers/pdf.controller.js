const PDFDocument = require("pdfkit");
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

    const doc = new PDFDocument({ margin: 60, size: "LETTER" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=constancia_${id}.pdf`,
    );
    doc.pipe(res);

    // Encabezado
    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("FERRETERÍA MADEYSO", { align: "center" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Hazlo bien, Hazlo mejor", { align: "center" });
    doc.moveDown(0.5);

    // Fecha
    doc
      .fontSize(10)
      .text(`La Ceiba, Atlántida   Fecha ${dia} de ${mes} de ${anio}`, {
        align: "right",
      });
    doc.moveDown(1.5);

    // Título
    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("CONSTANCIA DE ENTREGA DE EQUIPO", { align: "center" });
    doc.moveDown(1.5);

    // Datos del colaborador
    doc.fontSize(10).font("Helvetica");
    doc
      .text(`Yo, `, { continued: true })
      .font("Helvetica-Bold")
      .text(datos.persona_nombre, { continued: true })
      .font("Helvetica")
      .text(`   con número de Identidad `, { continued: true })
      .font("Helvetica-Bold")
      .text(datos.numero_identidad);
    doc.moveDown(1);
    doc
      .font("Helvetica")
      .text(
        "Por este medio hago constar que en esta fecha he recibido el siguiente equipo:",
      );
    doc.moveDown(1);

    // Tabla de equipo
    const tableTop = doc.y;
    const col1 = 60;
    const col2 = 220;
    const tableWidth = 490;
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
      const y = tableTop + i * rowHeight;
      doc.rect(col1, y, tableWidth, rowHeight).stroke();
      doc.rect(col1, y, 150, rowHeight).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(fila[0], col1 + 6, y + 9, { width: 138 });
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(fila[1] || "—", col2 + 6, y + 9, { width: tableWidth - 156 });
    });

    // Fila de descripción extra
    const notaY = tableTop + filas.length * rowHeight;
    const notaAltura = 50;
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

    doc.moveDown(8);

    // Cuerpo del texto
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        "Soy consciente que soy responsable del cuidado y resguardo del equipo detallado y que me es entregado para fines estrictamente laborales, por lo cual me comprometo a utilizarlo única y exclusivamente para realizar mis funciones diarias. De igual manera siendo que soy responsable de su guarda y custodia soy consciente que cualquier daño que el equipo sufra producto de mi negligencia o descuido será cargado el importe económico en que la empresa incurra por su reparación o reemplazo.",
        { align: "justify", lineGap: 2 },
      );

    doc.moveDown(4);

    // Firmas
    const firmaY = doc.y;
    const firma1X = 60;
    const firma2X = 340;
    const firmaWidth = 180;

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
      .text("Firma del Colaborador que recibe el equipo", firma1X, firmaY + 5, {
        width: firmaWidth,
        align: "center",
      });
    doc.text("Firma del Jefe Inmediato", firma2X, firmaY + 5, {
      width: firmaWidth,
      align: "center",
    });

    doc.end();

    // Marcar pdf como generado
    await pool
      .request()
      .input("id", sql.Int, id)
      .query(
        `UPDATE asignaciones SET pdf_generado = 'generado' WHERE id = @id`,
      );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { generarConstancia };
