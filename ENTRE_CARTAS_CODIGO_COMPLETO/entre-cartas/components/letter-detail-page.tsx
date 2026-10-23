"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { getCategory, getLetter } from "@/lib/letters";
import { folders } from "@/lib/folders";
import { useArchive } from "@/components/archive-store";
import { CategoryLabel, Paper, Polaroid, Stamp, Sticker, Tape } from "@/components/paper-kit";

export function LetterDetailPage({ id }: { id: string }) {
  const letter = getLetter(id);
  const { isSaved, toggleSaved, moveToFolder, folderById } = useArchive();
  const [notice, setNotice] = useState("");
  const [filingFolder, setFilingFolder] = useState<string | null>(null);
  const saved = letter ? isSaved(letter.id) : false;
  const category = letter ? getCategory(letter.category) : undefined;
  const filingTarget = folders.find((folder) => folder.id === filingFolder);

  if (!letter) return <main className="site-main not-found-paper"><span aria-hidden="true">✉</span><h1>Esta carta ainda não chegou.</h1><Link href="/arquivo">Voltar para o arquivo ↗</Link></main>;

  const handleSave = () => {
    toggleSaved(letter.id);
    setNotice(saved ? "A carta voltou para a mesa." : "Um carimbo vermelho marcou esta carta como arquivada.");
  };

  return <main className="site-main detail-page">
    <div className="page-ribbon"><Link href="/">INÍCIO</Link><span> / </span><Link href="/arquivo">O ARQUIVO</Link><span> / </span><span>{category?.name.toLocaleUpperCase("pt-BR")}</span></div>
    <div className="detail-back"><Link href="/arquivo">← Voltar às outras cartas</Link><span className="reading-time">{letter.readingTime}</span></div>
    <section className="scrapbook-detail" aria-labelledby="letter-title">
      <aside className="detail-margin detail-margin--left" aria-label="Notas no scrapbook">
        <span className="margin-star">✳</span><p>uma coisa<br />de cada vez</p><span className="margin-line" /><span className="margin-date">ARQUIVO<br />Nº {letter.id.slice(0, 2).toUpperCase()}</span>
      </aside>
      <motion.article className="letter-sheet" initial={{ opacity: 0, y: 14, rotate: -0.35 }} animate={{ opacity: 1, y: 0, rotate: -0.35 }} transition={{ duration: 0.5 }}>
        <Tape className="letter-sheet__tape" />
        <div className="letter-sheet__topline"><span>ENTRE CARTAS · CORRESPONDÊNCIA SEM ENDEREÇO</span><span>✦</span></div>
        <div className="letter-sheet__address"><CategoryLabel categoryId={letter.category} /><span>{letter.date}</span></div>
        <h1 id="letter-title">{letter.title}</h1>
        <p className="letter-sheet__greeting">Querida pessoa,</p>
        <div className="letter-content">{letter.content.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        <p className="letter-sheet__farewell">Com carinho,</p>
        <p className="letter-sheet__signature">{letter.sender}</p>
        <span className="letter-sheet__folio">— 01 —</span>
        <AnimatePresence>{saved && <motion.span className="letter-sheet__archive-stamp" initial={{ scale: 2.1, rotate: 7, opacity: 0 }} animate={{ scale: 1, rotate: 7, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>ARQUIVADA<br /><small>NO SEU ARQUIVO</small></motion.span>}</AnimatePresence>
      </motion.article>
      <aside className="detail-margin detail-margin--right" aria-label="Lembrete do arquivo">
        <Sticker className="detail-sticker">guarde<br />o que fica</Sticker>
        <Polaroid className="detail-polaroid" src="/manus-storage/async-images/McBsMqNfnwcUYsb0Oaer0J/image-1.webp" alt="Plataforma vazia de uma estação antiga ao entardecer" caption="a estação das seis" />
        <Stamp className="detail-postmark">✧<small>SEM DATA<br />DE VALIDADE</small></Stamp>
        <span className="hand-note">à mão, sempre</span>
      </aside>
    </section>
    <section className="detail-actions" aria-label="Ações da carta">
      <button className={`primary-cta ${saved ? "primary-cta--filed" : ""}`} type="button" onClick={handleSave} aria-pressed={saved}><span>{saved ? "Retirar do arquivo" : "Carimbar como favorita"}</span><span className="cta-arrow" aria-hidden="true">✳</span></button>
      <label className="folder-picker">Mover para a pasta
        <select aria-label="Escolher pasta para esta carta" value={folderById[letter.id] ?? folders[0].id} onChange={(event) => { moveToFolder(letter.id, event.target.value); setFilingFolder(event.target.value); setNotice("A carta foi acomodada na sua pasta."); }}>
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.label}</option>)}
        </select>
      </label>
      <AnimatePresence mode="wait"><motion.span key={notice || "empty"} className="action-notice" role="status" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>{notice}</motion.span></AnimatePresence>
    </section>
    <AnimatePresence initial={false}>{filingTarget && <motion.div key={filingTarget.id} className="filing-journey" role="status" aria-label={`Carta guardada na pasta ${filingTarget.label}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
      <motion.span className="filing-journey__letter" aria-hidden="true" initial={{ x: -8, y: -10, rotate: -9, scale: .9 }} animate={{ x: 99, y: 8, rotate: 2, scale: .62, opacity: .48 }} transition={{ type: "spring", stiffness: 110, damping: 16, duration: .8 }}>✉</motion.span>
      <span className="filing-journey__arrow" aria-hidden="true">↗</span>
      <span className="filing-journey__folder"><span className="filing-journey__tab" /><b>{filingTarget.label}</b></span>
    </motion.div>}</AnimatePresence>
    <div className="detail-source-note">{letter.sender}<span aria-hidden="true"> · </span> pequeno recorte de demonstração</div>
    <Paper className="detail-next-note"><span>Próxima dobra?</span><Link href="/arquivo">Encontrar outra carta <span aria-hidden="true">↗</span></Link></Paper>
  </main>;
}
