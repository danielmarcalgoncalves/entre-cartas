"use client";

import Link from "next/link";
import Folder from "@/components/Folder";
import LetterCard from "@/components/LetterCard";
import { useArchive } from "@/hooks/useArchive";
import { letters } from "@/data/letters";

const folderDefinitions = [
  { id: "amor", title: "Bilhetes de amor", tag: "gaveta 01", category: "amor", preview: ["um nome escrito devagar", "o verão de nós dois", "com carinho, sempre"] },
  { id: "saudade", title: "Saudades que têm endereço", tag: "gaveta 02", category: "saudade", preview: ["a rua da nossa casa", "um retrato guardado", "quando chove"] },
  { id: "nunca-enviadas", title: "O que ficou por dizer", tag: "gaveta 03", category: "nunca-enviadas", preview: ["para você, talvez", "dobrada em quatro", "fica aqui, então"] },
  { id: "outras", title: "Outros papéis guardados", tag: "arquivo livre", category: "other", preview: ["pequenos achados", "para reler depois", "palavras de casa"] },
];

export default function CollectionsPage() {
  const { ids } = useArchive("saved");
  const saved = letters.filter((letter) => ids.includes(letter.id));
  const groups = folderDefinitions.map((folder) => ({
    ...folder,
    items: folder.category === "other" ? saved.filter((letter) => !["amor", "saudade", "nunca-enviadas"].includes(letter.category)) : saved.filter((letter) => letter.category === folder.category),
  }));
  return (
    <div className="page-shell">
      <header className="page-heading">
        <span className="eyebrow">Pastas de arquivo · lembranças em ordem própria</span>
        <h1 className="display-title">Coleções guardadas</h1>
        <p className="page-intro">Uma pequena caixa para as cartas que você não quer perder. Quando guardar uma correspondência, ela encontrará lugar em uma dessas pastas de papel.</p>
      </header>
      <div className="folder-shelf">
        <Folder title="Tudo que guardei" count={saved.length} href="#arquivo-completo" tag="pasta principal" previews={saved.slice(0, 3).map((letter) => letter.title)} />
        {groups.map((folder) => <Folder key={folder.id} title={folder.title} count={folder.items.length} href={`#folder-${folder.id}`} tag={folder.tag} previews={folder.preview} />)}
      </div>
      {!saved.length ? (
        <div className="collection-empty" id="arquivo-completo">
          <span className="stamp-mark blue">PASTA VAZIA</span>
          <h2 className="section-title" style={{ marginTop: 18 }}>Ainda cabe muita coisa aqui.</h2>
          <p className="page-intro" style={{ margin: "12px auto 20px" }}>Abra uma carta e escolha “Guardar na pasta”. Ela fica neste arquivo, organizada por assunto.</p>
          <Link href="/discover" className="text-link">Descobrir cartas ↗</Link>
        </div>
      ) : (
        <section className="section-block" id="arquivo-completo">
          <div className="section-heading"><div><p className="section-kicker">Pasta principal</p><h2 className="section-title">Tudo que guardei</h2></div></div>
          <div className="letter-grid">{saved.map((letter) => <LetterCard key={letter.id} letter={letter} />)}</div>
        </section>
      )}
      {groups.map((folder) => (
        <section className="section-block" id={`folder-${folder.id}`} key={folder.id}>
          <div className="section-heading"><div><p className="section-kicker">{folder.tag}</p><h2 className="section-title">{folder.title}</h2></div></div>
          {folder.items.length ? <div className="letter-grid">{folder.items.map((letter) => <LetterCard key={letter.id} letter={letter} />)}</div> : <p className="page-intro">Esta pasta ainda espera pela primeira carta.</p>}
        </section>
      ))}
    </div>
  );
}
