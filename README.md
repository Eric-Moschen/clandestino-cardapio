# O Clandestino — cardápio digital + painel administrativo

Projeto em Next.js App Router + TypeScript + Supabase (PostgreSQL, Auth e Storage). O cardápio público é somente leitura; alterações exigem login e uma associação explícita em `public.admin_users`.

## Requisitos

- Node.js 20.9 ou superior
- Projeto no Supabase

## 1. Instalar e configurar

```bash
npm install
```

Copie `.env.example` para `.env.local` e preencha os valores em **Supabase → Project Settings → API**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publishable
```

Use a chave publicável (publishable/anon, conforme o painel do projeto). **Nunca coloque `service_role` ou secret key em variáveis `NEXT_PUBLIC_*` nem no navegador.**

## 2. Criar tabelas, segurança e armazenamento

No Supabase, abra **SQL Editor**, cole e execute todo o conteúdo de `supabase/schema.sql`. O script cria as tabelas `categories`, `products`, `admin_users`, políticas RLS e o bucket público `product-images`. A leitura das imagens é pública; envio, atualização e exclusão exigem usuário autorizado como administrador.

## 3. Criar a conta de administrador

1. No Supabase, vá a **Authentication → Users → Add user**.
2. Crie o usuário com o e-mail e senha que serão usados no painel. Se disponível, confirme/verifique o e-mail na criação.
3. Copie o UUID desse usuário.
4. No SQL Editor, execute o comando abaixo substituindo o e-mail pelo e-mail exato da conta criada:

```sql
insert into public.admin_users (user_id)
select id from auth.users where lower(email) = lower('SEU-EMAIL-AQUI')
on conflict (user_id) do nothing;
```

Apenas usuários presentes em `admin_users` podem acessar o painel e alterar dados. Não existe cadastro público de administrador.

## 4. Rodar localmente

```bash
npm run dev
```

- Cardápio público: `http://localhost:3000`
- Painel administrativo: `http://localhost:3000/admin`
- Login: `http://localhost:3000/admin/login`

## Recursos do painel

- Login e logout com Supabase Auth.
- Dashboard com contagem de produtos, itens disponíveis e categorias.
- Cadastro, edição, ordenação, ativação/desativação e exclusão de categorias.
- Cadastro e edição de produtos, preço, descrição, ingredientes, detalhes, categoria, ordem, disponibilidade e imagem.
- Upload de imagens no Supabase Storage com limite de 5 MB.
- Busca e filtros por disponibilidade; alternância rápida de disponibilidade.
- Server Actions validadas e políticas RLS no banco para autorizar toda escrita.

## Observações de segurança e operação

- A chave Supabase publicável é adequada para o browser somente porque as tabelas e o Storage estão protegidos por RLS.
- A autorização administrativa é baseada na tabela `admin_users`, não em `user_metadata` editável pelo usuário.
- O bucket `product-images` é público para que as fotos apareçam no cardápio; não envie imagens privadas ou dados pessoais.
- Para remover administradores, apague a associação correspondente de `public.admin_users`.
- Antes de publicar, configure domínio/HTTPS, política de backup do projeto Supabase, monitoramento e teste as políticas no projeto real.


## Atendimento por mesa e garçons

O projeto inclui agora a página inicial, seleção de mesa, chamados, área do garçom, gestão de mesas/garçons e vídeo nos detalhes dos produtos.

### 5. Atualizar o banco

No Supabase → SQL Editor, execute novamente o arquivo **completo** `supabase/schema.sql`. O script é aditivo e cria as tabelas `restaurant_tables`, `staff_users`, `waiter_calls`, `push_subscriptions`, a coluna `products.video_path`, políticas RLS e as funções atômicas de chamado/aceitação. Ele preserva as tabelas existentes. Revise o SQL antes de executar em produção.

### 6. Cadastrar mesas

No painel em `/admin/tables`, cadastre cada mesa e deixe-a ativa. Para QR Codes impressos, use um link direto como `https://SEU-DOMINIO/?mesa=3`, substituindo `3` pelo número da mesa. A página inicial identifica automaticamente a mesa quando o parâmetro corresponde a uma mesa cadastrada e oculta a seleção manual. A mesma URL pode ser gravada no QR Code e programada na etiqueta NFC da mesa. O cliente escolhe o tipo de solicitação (dúvida, pedido, conta, garçom, talheres/limpeza ou outro).

### 7. Cadastrar garçons

1. No painel administrativo, acesse `/admin/staff` e cadastre o nome, e-mail e senha inicial do garçom. A criação de usuários exige `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor.
2. O garçom acessa `/garcom/login` com o e-mail e a senha cadastrados.
3. Depois de entrar, toque em **Ativar notificações neste celular** e aceite a permissão do navegador. Repita em cada aparelho que receberá notificações.

A aceitação do chamado é feita por uma função SQL atômica: se dois garçons tentarem aceitar a mesma mesa simultaneamente, apenas um terá sucesso. Os demais verão o nome do responsável no painel. O garçom responsável poderá tocar em **Finalizar atendimento**; a ação registra data e hora e move o chamado para o histórico como concluído.

### 8. Configurar notificações push

Notificações push reais precisam de HTTPS (a Vercel fornece), permissão do navegador e chaves VAPID. Na área do garçom, o botão **Enviar notificação de teste** ajuda a confirmar a entrega ao aparelho. Gere o par de chaves no terminal do projeto:

```bash
npx web-push generate-vapid-keys
```

Configure as seguintes variáveis no `.env.local` e nas Environment Variables da Vercel, em todos os ambientes necessários:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: chave pública gerada.
- `VAPID_PRIVATE_KEY`: chave privada gerada, somente no servidor.
- `VAPID_SUBJECT`: um contato no formato `mailto:email@seudominio.com`.
- `SUPABASE_SERVICE_ROLE_KEY`: chave secreta de serviço do Supabase, somente no servidor. Nunca use o prefixo `NEXT_PUBLIC_` nessa chave.

Depois de alterar as variáveis na Vercel, faça um novo deploy. Garçons devem ativar as notificações novamente em cada celular/navegador. Se as variáveis push ainda não estiverem configuradas, o chamado é gravado e aparece no painel, mas o navegador não enviará notificações push em segundo plano.

### 9. Vídeos dos produtos

No formulário do produto, envie um vídeo MP4, WebM ou MOV de até 30 MB. O vídeo é armazenado no bucket público `product-videos` e aparece na janela de detalhes do produto, com controles de reprodução. Prefira MP4 H.264, formato vertical ou quadrado e poucos segundos para reduzir consumo de dados.

### Novas rotas

- `/`: página inicial e chamada da mesa.
- `/cardapio`: cardápio público.
- `/mesa?mesa=3`: página de chamada dedicada a uma mesa (útil para QR Codes).
- `/admin/tables`: cadastro e ativação de mesas.
- `/admin/staff`: cadastro e ativação de garçons.
- `/admin/calls`: visão administrativa e histórico de chamados.
- `/garcom/login` e `/garcom`: login e tela de atendimento dos garçons.

### Observações importantes

- Configure e teste RLS no projeto Supabase antes de abrir o site ao público.
- A chave `SUPABASE_SERVICE_ROLE_KEY` ignora RLS; mantenha-a exclusivamente nas variáveis de servidor da Vercel. Ela é usada apenas para enviar push aos aparelhos cadastrados.
- **Android:** use uma versão atualizada do Chrome (ou navegador compatível), HTTPS e permita notificações. **iPhone/iPad:** notificações web push exigem iOS/iPadOS 16.4 ou posterior; no Safari, use Compartilhar → Adicionar à Tela de Início, abra o ícone instalado e então conceda permissão. Ative notificações em cada aparelho e mantenha as chaves VAPID consistentes entre os deploys. O botão de teste na área do garçom ajuda a diagnosticar a configuração. O painel também atualiza os chamados por Supabase Realtime e consulta novamente periodicamente.
- O botão do cliente registra um chamado por mesa enquanto houver um chamado pendente ou em atendimento. A administração encerra o atendimento em `/admin/calls`, liberando a mesa para um novo chamado.
- Antes de produção, teste a criação/aceitação simultânea de chamados, permissões de administrador/garçom, entrega de push em iOS/Android e encerramento de atendimento.


### Cadastro de garçons, sessão e links das mesas

- Cadastre garçons em **Administração → Garçons** usando nome, e-mail e senha inicial (mínimo de 8 caracteres). Para isso, configure `SUPABASE_SERVICE_ROLE_KEY` nas variáveis de ambiente do servidor; nunca use essa chave com prefixo `NEXT_PUBLIC_`.
- A sessão do painel administrativo é encerrada após 10 minutos sem interação no navegador. Ao retornar à aba, o sistema verifica se o prazo expirou.
- Em **Administração → Mesas**, cada mesa exibe o link exclusivo `/mesa?mesa=N` e a opção para copiá-lo. Use o link para gerar o QR Code ou gravá-lo na etiqueta NFC. Configure `NEXT_PUBLIC_SITE_URL` para fixar o domínio público em produção.
- Ao abrir o detalhe de um produto com vídeo cadastrado, o vídeo inicia automaticamente, sem áudio, em loop. O navegador pode bloquear autoplay em algumas condições, mas o vídeo permanece disponível pelos controles.
