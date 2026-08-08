# Rodar o GCM Ponto no seu computador

Depois disso você testa tudo antes de publicar. Só sobe pro GitHub quando
estiver do jeito que você quer.

Instalação: uma vez só, uns 10 minutos.
Uso diário: dois comandos.

---

## Passo 1 — Instalar o Node.js

O Node é o programa que roda o app na sua máquina. Sem ele, nada funciona.

1. Abra https://nodejs.org
2. Baixe o botão da esquerda, o **LTS** (é a versão estável)
3. Execute o instalador
4. **Avançar** em tudo, sem mudar nada, até **Concluir**

> Se aparecer uma tela perguntando sobre "Tools for Native Modules", pode
> deixar desmarcado. Não precisamos disso.

---

## Passo 2 — Conferir se instalou

1. Aperte a tecla **Windows**
2. Digite `cmd` e abra o **Prompt de Comando**
3. Digite e dê Enter:

```
node -v
```

Tem que aparecer algo como `v22.11.0`. Qualquer número acima de v18 serve.

Se der "não é reconhecido como comando", **feche o Prompt e abra de novo**.
O Windows só enxerga o Node depois de reabrir. Se ainda assim não funcionar,
reinicie o computador.

---

## Passo 3 — Ir até a pasta do projeto

Ainda no Prompt de Comando. Supondo que a pasta seja `ponto2` na Área de
Trabalho:

```
cd %USERPROFILE%\Desktop\ponto2
```

Enter. O começo da linha muda para o caminho da pasta.

> **Não sabe o caminho?** Abra a pasta no Explorador, clique na barra de
> endereço lá em cima, copie o que aparecer, e use `cd ` seguido de um
> espaço e do que você copiou.

Confirme que está no lugar certo:

```
dir
```

Deve listar `public`, `src`, `package.json`, `index.html`. Se não listar,
você está na pasta errada.

---

## Passo 4 — Instalar as peças do projeto (uma vez só)

```
npm install
```

Demora de 1 a 3 minutos e escreve bastante coisa na tela. É normal.

Aviso amarelo de "vulnerabilities" no fim também é normal — não atrapalha
nada aqui, porque este app não tem servidor.

Isso cria uma pasta `node_modules` com uns 200 MB. Ela **não** vai pro
GitHub, o `.gitignore` já cuida disso.

---

## Passo 5 — Abrir o app

```
npm run dev
```

Vai aparecer algo assim:

```
  VITE v5.4.21  ready in 320 ms

  ➜  Local:   http://localhost:5173/
```

Abra `http://localhost:5173` no Chrome. O app está rodando na sua máquina.

**O melhor dessa parte:** deixe o Prompt aberto e edite qualquer arquivo do
projeto. Salvou, o navegador atualiza sozinho na hora. Sem publicar, sem
esperar Netlify, sem gastar upload.

Para parar: clique no Prompt e aperte **Ctrl + C**.

---

## Passo 6 — Conferir as regras antes de publicar

```
npm run teste
```

Roda 43 verificações do cálculo em segundos:

```
═══ 43 passaram · 0 falharam ═══
```

Se aparecer alguma falha, ele diz qual regra quebrou. Aí não publique.

Outros dois, quando quiser ir mais fundo:

```
npm run teste:fluxo      percorre o app inteiro
npm run teste:janelas    confere se toda janela abre e fecha
```

---

## O ciclo novo

```
1. Colo os arquivos novos na pasta
2. npm run dev        → testo no navegador até gostar
3. npm run teste      → confiro que não quebrei o cálculo
4. Subo pro GitHub    → só agora, e com certeza de que está bom
```

Antes você descobria problema com o app já no ar. Agora descobre antes.

---

## Testar no celular sem publicar

Com o computador e o celular no mesmo Wi-Fi, rode:

```
npm run dev -- --host
```

Vai aparecer uma segunda linha, **Network**, com um endereço tipo
`http://192.168.0.15:5173`. Digite esse endereço no navegador do celular.

O app roda no seu celular, direto da sua máquina, sem passar pela internet.
Dá para testar no iPhone e no Android antes de qualquer publicação.

> Câmera e biometria não funcionam por esse endereço — o navegador exige
> HTTPS para liberar. Todo o resto funciona.

---

## Problemas comuns

**"npm não é reconhecido como comando"**
Feche o Prompt e abra de novo. Se persistir, reinicie o computador.

**"ENOENT: no such file or directory, open package.json"**
Você não está na pasta do projeto. Volte ao Passo 3.

**"Port 5173 is already in use"**
Já tem um `npm run dev` rodando em outro Prompt. Feche o outro, ou aceite a
porta que ele sugerir.

**A tela abre em branco**
Olhe o Prompt: o erro está escrito lá, com nome do arquivo e linha.

**Mudei um arquivo e nada mudou no navegador**
Ctrl + Shift + R no navegador. Se não resolver, pare com Ctrl + C e rode
`npm run dev` de novo.
