# Como atualizar o app sem sofrimento

Se você chegou até aqui baixando zip, extraindo e arrastando arquivo pro
GitHub a cada mudança — para. Faz isso uma vez e nunca mais repete.

---

## Configuração (10 minutos, uma única vez)

1. Instale o **GitHub Desktop**: https://desktop.github.com
2. Abra e entre com a mesma conta do GitHub (`pontomarcelo`).
3. **File → Clone repository → gcm-ponto → Clone.**
   Ele baixa o projeto para uma pasta no seu computador.
   Anote onde ficou. Costuma ser `Documentos\GitHub\gcm-ponto`.

Pronto. Essa pasta agora está ligada ao GitHub.

---

## A cada atualização (30 segundos)

1. Baixe o zip novo e extraia.
2. Copie **tudo de dentro** e cole na pasta do GitHub Desktop, substituindo.
3. Abra o GitHub Desktop. Ele já mostra sozinho o que mudou.
4. Escreva qualquer coisa no campo de baixo e clique em **Commit to main**.
5. Clique em **Push origin**.

O Netlify recompila sozinho e publica em cerca de 2 minutos.

Sem arrastar arquivo pro navegador. Sem medo de esquecer pasta. E o GitHub
Desktop mostra exatamente o que mudou antes de enviar — se algo vier errado,
você vê antes.

---

## Testando antes de publicar

Com o Node.js instalado, dentro da pasta do projeto:

```bash
npm install     # só na primeira vez
npm run teste   # confere as regras de cálculo em segundos
npm run dev     # abre o app no seu computador para experimentar
```

O `npm run teste` roda 43 verificações: divisão das 135h, extra convocada,
teto de 44h, diária fora da folha, virada de dia, virada de mês, ano
bissexto e recálculo ao editar lançamento antigo. Se alguma falhar, ele
avisa qual — antes de ir para o celular do guarda.

---

## Quando o app não abrir no celular

Quase sempre é versão antiga presa no aparelho.

Espere 7 segundos na tela de abertura: aparece o botão **"Limpar e abrir
de novo"**. Ele resolve sozinho.

Se preferir na mão:

- **iPhone:** Ajustes → Safari → Avançado → Dados de Sites → apague o site.
  Limpar histórico **não** basta.
- **Android:** Configurações do Chrome → Configurações do site →
  Dados armazenados → apague o site.
