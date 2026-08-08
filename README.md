# GCM Ponto

**Controle Inteligente de Jornada da Guarda Municipal**

Aplicativo PWA para o guarda registrar a jornada, acompanhar as 135 horas mensais e as 44 horas extras, e emitir o relatório assinado em PDF. Funciona offline e instala no Android, iPhone, tablet e desktop.

---

> **Primeira vez?** Leia o `RODAR-NO-COMPUTADOR.md`. Ele ensina a rodar o
> app na sua máquina para testar antes de publicar.

> **Vai atualizar o app?** Leia o `COMO-ATUALIZAR.md`. Ele mostra como sair
> do vai-e-vem de zip e publicar em 30 segundos com o GitHub Desktop.

## Rodar no seu computador

Precisa do [Node.js 18+](https://nodejs.org).

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente `http://localhost:5173`).

Para conferir as regras de cálculo:

```bash
npm run teste
```

São 43 verificações automáticas — divisão das 135h, extra convocada, teto de
44h, diária fora da folha, virada de dia e de mês. Rode sempre antes de
publicar.

Para gerar a versão de produção:

```bash
npm run build      # gera a pasta dist/
npm run preview    # testa a versão de produção
```

---

## Publicar no Netlify

1. Suba o projeto para um repositório no GitHub.
2. Entre no [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project**.
3. Escolha o repositório. O arquivo `netlify.toml` já traz a configuração certa:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Clique em **Deploy**.

O Netlify serve em HTTPS, que é obrigatório para o service worker, a câmera e a biometria funcionarem.

## Publicar no GitHub Pages

```bash
npm install
npm run deploy
```

O comando compila e envia a pasta `dist` para o branch `gh-pages`. Depois, no repositório: **Settings → Pages → Source: gh-pages**.

O `base: './'` no `vite.config.js` já resolve o caminho de subpasta que o GitHub Pages usa.

---

## Instalar no celular

**Android (Chrome):** abra o site → menu ⋮ → *Instalar aplicativo*.

**iPhone (Safari):** abra o site → botão Compartilhar → *Adicionar à Tela de Início*.

Depois de instalado, o app abre sem barra de navegador e funciona sem internet.

---

## Identidade visual

O brasão oficial da Guarda Municipal de Itapajé já está aplicado em todo o app:

| Arquivo | Tamanho | Onde aparece |
|---|---|---|
| `public/logo/gcm-logo.png` | 600×600 | Splash, cabeçalho do app |
| `public/logo/gcm-logo-pdf.png` | 187×210 | Cabeçalho do relatório em PDF |
| `public/icons/icon-192.png` | 192×192 | Ícone do app |
| `public/icons/icon-512.png` | 512×512 | Ícone do app |
| `public/icons/maskable-512.png` | 512×512 | Ícone adaptável do Android |
| `public/icons/apple-touch-icon.png` | 180×180 | Ícone do iPhone |

A versão do PDF é propositalmente mais leve: mantém o relatório em torno de 230 KB, tamanho que passa tranquilo no WhatsApp todo mês.

Se um dia o brasão mudar, substitua os arquivos mantendo os mesmos nomes e proporções. O brasão é mais alto que largo (proporção 0,89) — essa razão está no `src/services/pdf.js` para o desenho não achatar.

---

## Como a contagem funciona

Definida em `src/services/calc.js`:

- **135 horas** de carga mensal e teto de **44 horas** extras.
- Enquanto o mês não fecha as 135 horas, tudo entra como **hora normal**.
- Passou das 135, tudo vira **hora extra** sozinho.
- Se um lançamento cruza a marca, ele é **dividido automaticamente**. Faltavam 2 horas e o guarda lançou 6? Grava 2 normais + 4 extras.
- O rateio segue a ordem cronológica. Editar um lançamento antigo recalcula o mês inteiro.
- Turno que atravessa a madrugada (22:00 → 06:00) conta 8 horas.
- Alertas em **35h**, **40h** e **44h** de extra.

Para mudar as regras, altere `CARGA_MENSAL` e `LIMITE_EXTRA` no topo do arquivo. Todo o resto do app se ajusta.

---

## Estrutura

```
gcm-ponto/
├── index.html
├── vite.config.js
├── netlify.toml
├── public/
│   ├── manifest.json
│   ├── service-worker.js
│   ├── icons/
│   └── logo/
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── components/       Gauge, Icons, UI
    ├── pages/            Splash, Cadastro, Dashboard, Lancamento,
    │                     Calendario, Historico, Estatisticas,
    │                     Relatorio, Ajustes
    ├── services/         db, calc, pdf, share, auth, backup
    ├── context/          AppContext
    └── styles/           global.css
```

---

## Gaveta de arquivos

Uma pasta dentro do app para a foto da folha assinada, o PDF da escala do
grupo e o que mais precisar comprovar. Aceita qualquer tipo de arquivo e
organiza por competência.

Fotos são reduzidas para até 2000px antes de guardar — uma folha de ponto
fotografada não fica melhor com 4 MB, e assim cabem muito mais no aparelho.

## Backup

Dois formatos, escolhidos de propósito:

| Formato | Leva | Quando usar |
|---|---|---|
| `.gcm` | lançamentos **e** arquivos da gaveta | trocar de celular |
| `.json` | só os lançamentos | rotina, cabe no WhatsApp |

O `.gcm` é um zip por dentro. Salve no Google Drive ou mande para o próprio
e-mail. No aparelho novo: **Ajustes → Restaurar backup**.

O botão de restaurar aceita os dois formatos e reconhece qual é sozinho.

## Dados e segurança

Tudo fica no **IndexedDB do aparelho**. Nada é enviado para servidor nenhum.

- O **PIN** é guardado como hash SHA-256 com salt — não dá para recuperar o número.
- A **biometria** usa WebAuthn: a digital nunca sai do aparelho, o app só recebe a confirmação.
- O **backup** em `.json` não leva o PIN nem a biometria, de propósito. Eles pertencem ao aparelho.

Oriente o guarda a gerar backup antes de trocar de celular ou limpar os dados do navegador.

---

## Assinatura do relatório

A assinatura **não libera** o relatório — ele é do guarda e sempre pode ser gerado. Ela serve para **autenticar** o PDF antes de enviar ao comando, gravando no documento o método usado, a data e um código de autenticação.

Três formas: PIN de 6 dígitos, selfie (a foto entra no bloco de autenticação do PDF) e biometria do aparelho.

> A câmera e a biometria só funcionam em HTTPS ou em `localhost`.

---

## Próximos passos previstos

A arquitetura já está preparada para: múltiplos municípios, login individual, sincronização em nuvem e empacotamento para a Play Store (via TWA / Bubblewrap, aproveitando o mesmo PWA).

---

Versão 1.0.0
