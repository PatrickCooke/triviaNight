import PDFDocument from 'pdfkit';
import seedrandom from 'seedrandom';

interface Question {
    type: 'multi_part' | 'multiple_choice' | 'matching' | 'sequencing';
    prompt: string;
    content: any;
}

interface Round {
    title: string;
    questions: Question[];
}

export async function generateScoreSheet(rounds: Round[], seed?: string): Promise<Buffer> {
    const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 36, bottom: 36, left: 54, right: 54 }
    });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    const rng = seedrandom(seed || Math.random().toString());

    rounds.forEach((round, index) => {
        if (index > 0 && index % 2 === 0) {
            doc.addPage();
        }

        const isBottomHalf = index % 2 === 1;
        const topOffset = isBottomHalf ? 396 : 0;

        renderRound(doc, round, topOffset, rng);

        if (!isBottomHalf && index < rounds.length - 1) {
            // Draw horizontal divider
            doc.moveTo(36, 396)
               .lineTo(576, 396)
               .dash(5, { space: 5 })
               .strokeColor('#cccccc')
               .stroke()
               .undash()
               .strokeColor('#000000');
        }
    });

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => {
            resolve(Buffer.concat(buffers));
        });
    });
}

function renderRound(doc: typeof PDFDocument, round: Round, topOffset: number, rng: seedrandom.PRNG) {
    const startY = topOffset + 36;
    const centerX = 306;
    const colWidth = 230;
    
    // Team Name field
    doc.font('Helvetica').fontSize(12).text('TEAM NAME:', 54, startY);
    doc.moveTo(135, startY + 10).lineTo(centerX + 10 + colWidth, startY + 10).stroke();

    // Title
    doc.font('Helvetica-Bold').fontSize(16).text(round.title.toUpperCase(), 54, startY + 25, { align: 'center', width: 504 });
    
    let currentY = startY + 55;

    const standardQuestions = round.questions.filter(q => q.type === 'multiple_choice' || q.type === 'multi_part');
    const specialQuestions = round.questions.filter(q => q.type === 'matching' || q.type === 'sequencing');

    // Split standard questions into columns
    const leftCount = Math.ceil(standardQuestions.length / 2);
    const leftCols = standardQuestions.slice(0, leftCount);
    const rightCols = standardQuestions.slice(leftCount);

    const questionSpacing = 22;

    // Render columns
    doc.font('Helvetica').fontSize(11);
    
    leftCols.forEach((q, i) => {
        const y = currentY + (i * questionSpacing);
        doc.text(`${i + 1}.`, 54, y);
        doc.moveTo(75, y + 10).lineTo(54 + colWidth, y + 10).stroke();
    });

    rightCols.forEach((q, i) => {
        const y = currentY + (i * questionSpacing);
        doc.text(`${leftCount + i + 1}.`, centerX + 10, y);
        doc.moveTo(centerX + 35, y + 10).lineTo(centerX + 10 + colWidth, y + 10).stroke();
    });

    currentY += Math.max(leftCols.length, rightCols.length) * questionSpacing + 10;

    // Special Questions
    specialQuestions.forEach((sq) => {
        if (sq.type === 'matching') {
            renderMatching(doc, sq, currentY, rng);
            currentY += 120; // Estimated height for matching
        } else if (sq.type === 'sequencing') {
            renderSequencing(doc, sq, currentY, rng);
            currentY += 100; // Estimated height for sequencing
        }
    });
}

function renderMatching(doc: typeof PDFDocument, q: Question, y: number, rng: seedrandom.PRNG) {
    doc.font('Helvetica-Bold').fontSize(12).text('Question 10 — Matching:', 54, y);
    doc.font('Helvetica-Oblique').fontSize(9).text('Write the matching letter/number next to each item, or draw a line connecting them.', 54, y + 15);
    
    const pairs = q.content.pairs || [];
    const leftItems = pairs.map((p: any) => ({ text: p.left })).sort((a: any, b: any) => a.text.localeCompare(b.text));
    const rightItems = pairs.map((p: any) => ({ text: p.right })).sort(() => rng() - 0.5);

    const itemYStart = y + 35;
    const itemSpacing = 18;

    doc.font('Helvetica').fontSize(10);
    leftItems.forEach((item: any, i: number) => {
        const iy = itemYStart + (i * itemSpacing);
        // doc.moveTo(54, iy + 10).lineTo(84, iy + 10).stroke(); // Blank line for answer
        doc.text(item.text, 95, iy);
    });

    rightItems.forEach((item: any, i: number) => {
        const iy = itemYStart + (i * itemSpacing);
        doc.text(item.text, 320, iy);
    });
}

function renderSequencing(doc: typeof PDFDocument, q: Question, y: number, rng: seedrandom.PRNG) {
    doc.font('Helvetica-Bold').fontSize(12).text('Question 10 — Sequencing:', 54, y);
    doc.font('Helvetica-Oblique').fontSize(9).text('Number the items in the correct order (1 being the earliest/first).', 54, y + 15);

    const items = [...(q.content.items || [])].sort(() => rng() - 0.5);
    const itemYStart = y + 35;
    const itemSpacing = 18;

    doc.font('Helvetica').fontSize(10);
    items.forEach((item: string, i: number) => {
        const iy = itemYStart + (i * itemSpacing);
        doc.text('[    ]', 54, iy);
        doc.text(item, 90, iy);
    });
}

export async function generateMasterPrintout(rounds: Round[], mode: 'questions' | 'answers' | 'full'): Promise<Buffer> {
    const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 54, bottom: 54, left: 72, right: 72 }
    });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    doc.font('Helvetica-Bold').fontSize(20).text('TRIVIA MASTER SHEET', { align: 'center' });
    doc.fontSize(12).text(mode.toUpperCase(), { align: 'center' });
    doc.moveDown(2);

    rounds.forEach((round, rIndex) => {
        doc.font('Helvetica-Bold').fontSize(14).text(round.title.toUpperCase());
        doc.moveDown(0.5);

        round.questions.forEach((q, qIndex) => {
            const label = `${qIndex + 1}. `;
            doc.font('Helvetica-Bold').fontSize(11).text(label, { continued: true });
            doc.font('Helvetica').text(q.prompt);
            
            doc.moveDown(0.2);

            if (mode === 'questions') {
                doc.moveDown(0.8);
            } else if (mode === 'answers') {
                doc.font('Helvetica-Bold').fillColor('red').text(`ANSWER: ${getAnswerString(q)}`);
                doc.fillColor('black');
                doc.moveDown(0.5);
            } else if (mode === 'full') {
                renderFullDetails(doc, q);
                doc.moveDown(0.5);
            }
        });

        if (rIndex < rounds.length - 1) {
            doc.addPage();
        }
    });

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => {
            resolve(Buffer.concat(buffers));
        });
    });
}

function getAnswerString(q: Question): string {
    const c = q.content;
    if (q.type === 'multiple_choice') return c.correct || 'N/A';
    if (q.type === 'multi_part') {
        const parts = c.parts || [];
        return parts.map((p: any) => p.text).join(', ');
    }
    if (q.type === 'matching') {
        return (c.pairs || []).map((p: any) => `${p.left} -> ${p.right}`).join('; ');
    }
    if (q.type === 'sequencing') {
        return (c.items || []).join(', ');
    }
    return 'N/A';
}

function renderFullDetails(doc: typeof PDFDocument, q: Question) {
    const c = q.content;
    doc.fontSize(10);
    
    if (q.type === 'multiple_choice') {
        const choices = [c.correct, ...(c.distractors || [])].filter(Boolean);
        choices.forEach(choice => {
            const isCorrect = choice === c.correct;
            doc.font(isCorrect ? 'Helvetica-Bold' : 'Helvetica')
               .text(`${isCorrect ? '[X]' : '[ ]'} ${choice}`, { indent: 20 });
        });
    } else if (q.type === 'multi_part') {
        const parts = c.parts || [];
        parts.forEach((p: any, i: number) => {
            doc.text(`Part ${i + 1}: ${p.text}`, { indent: 20 });
        });
    } else if (q.type === 'matching') {
        (c.pairs || []).forEach((p: any) => {
            doc.text(`${p.left} matches with ${p.right}`, { indent: 20 });
        });
    } else if (q.type === 'sequencing') {
        (c.items || []).forEach((item: string, i: number) => {
            doc.text(`${i + 1}. ${item}`, { indent: 20 });
        });
    }
}
