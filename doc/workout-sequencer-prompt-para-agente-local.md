# Prompt completo para melhorar o software Workout Sequencer

Você é um agente de desenvolvimento local responsável por melhorar e manter um aplicativo pessoal de gerenciamento e execução de workouts. Antes de alterar qualquer código, inspecione o projeto existente, entenda sua arquitetura, execute a suíte de testes atual e preserve as funcionalidades que já estão funcionando. Não reconstrua o aplicativo do zero sem necessidade. Faça mudanças incrementais, verificáveis e compatíveis com os dados existentes.

## 1. Objetivo do produto

Construir um aplicativo web pessoal, responsivo e mobile-first para organizar, importar, ordenar, executar e registrar workouts. O aplicativo será usado principalmente em um celular durante o treino. A experiência central deve ser extremamente prática: o usuário entra, vê o workout do dia, executa os exercícios em sequência, marca o treino como concluído ou pula para outro, e consegue consultar o histórico posteriormente.

O aplicativo deve funcionar como um local personalizado de workouts, não como uma rede social ou plataforma pública. O foco é execução rápida, clareza visual, pouca distração, persistência dos dados e facilidade para adicionar novos treinos.

## 2. Usuário e acesso

O aplicativo é pessoal e deve possuir autenticação. Cada usuário deve visualizar apenas seus próprios workouts, sessões, arquivos importados e configurações. O usuário autenticado deve entrar diretamente no seu dashboard pessoal. Se não estiver autenticado, deve ver uma tela simples de entrada e ser encaminhado para o login.

Não criar avaliações, depoimentos, comentários ou dados fictícios de usuários. Não criar conteúdo social desnecessário. Os workouts padrão podem ser carregados como dados iniciais do próprio usuário quando isso fizer parte da configuração inicial, mas devem ser claramente tratados como workouts pessoais importados/configurados, não como avaliações de terceiros.

## 3. Importação de PDF com inteligência artificial

O usuário deve poder fazer upload de um PDF contendo um ou vários workouts. O sistema deve armazenar o arquivo original com segurança e enviar o conteúdo extraído para um modelo de linguagem para conversão em uma estrutura padronizada.

A inteligência artificial deve identificar, quando possível:

- nome do workout;
- descrição ou objetivo;
- nível de dificuldade;
- data sugerida ou frequência, se existir;
- ordem dos workouts no documento;
- seções do treino;
- formato da seção, como AMRAP, EMOM, FOR TIME, rounds, tempo, técnica, força ou cardio;
- nome dos exercícios;
- quantidade de séries;
- repetições;
- duração ou tempo;
- carga;
- distância;
- observações;
- prescrições textuais originais.

A conversão nunca deve salvar automaticamente uma estrutura duvidosa sem mostrar uma etapa de revisão. Após a extração, apresentar uma tela editável de revisão. O usuário deve poder corrigir nome, descrição, nível, seções, exercícios, séries, repetições, tempo, carga, notas e ordem antes de confirmar o salvamento.

Se o PDF contiver vários workouts, permitir revisar todos eles antes de salvar ou revisar um por vez. Preservar o texto original relevante para que o usuário possa conferir se a interpretação da IA está correta. Mostrar mensagens claras quando algum campo não puder ser identificado.

O backend deve validar a resposta estruturada da IA antes de persistir. Nunca confiar cegamente em JSON produzido pelo modelo. Usar schema validation, valores padrão seguros e tratamento explícito para conteúdo ausente ou malformado.

## 4. Estrutura de dados recomendada

Organizar os dados com entidades equivalentes às seguintes:

| Entidade | Responsabilidade |
|---|---|
| Usuário | Identidade e isolamento dos dados pessoais. |
| Workout | Nome, descrição, nível, ordem, status e metadados do treino. |
| Seção do workout | Bloco do treino, como técnica, força, EMOM, AMRAP ou rounds. |
| Exercício | Nome, prescrição, séries, repetições, tempo, carga, distância, notas e ordem. |
| Sessão | Registro de uma execução, conclusão ou salto de um workout. |
| Arquivo importado | Nome, tipo, chave de storage e referência ao PDF original. |
| Demonstração | Referência opcional a imagem, sticker ou ilustração de um exercício. |

Armazenar timestamps em UTC. Exibir datas no fuso local do usuário. Manter ordem explícita para workouts, seções e exercícios. Evitar armazenar binários grandes diretamente no banco; usar storage de objetos e guardar somente metadados e referências.

## 5. Dashboard inicial

Ao abrir o aplicativo autenticado, o usuário deve ver imediatamente o workout do dia. Não mostrar uma tela vazia ou obrigar o usuário a navegar por várias telas antes de começar.

A seleção inicial deve considerar o histórico. O comportamento esperado é:

1. identificar workouts disponíveis;
2. identificar quais ainda não foram concluídos no ciclo atual;
3. selecionar um workout pendente de maneira aleatória ou conforme a regra de sequência configurada;
4. mostrar claramente qual workout está sendo executado;
5. informar quantos workouts existem e quantos já foram concluídos;
6. permitir iniciar o treino imediatamente.

O botão “Próximo” deve trazer outro workout, preferencialmente sem repetir imediatamente o workout atual. O botão “Pular” deve registrar que o workout foi pulado, sem marcá-lo como concluído, e encaminhar para outro treino. O sistema não deve voltar sempre ao primeiro workout por causa de um fallback temporário ou carregamento assíncrono.

O dashboard também deve permitir acessar:

- sequência completa de workouts;
- histórico de sessões;
- tela de gerenciamento;
- importação de novos PDFs;
- criação manual de workout;
- edição dos workouts existentes.

## 6. Sequência e organização dos workouts

Os workouts devem ser exibidos em uma sequência compreensível. O usuário deve poder:

- reordenar workouts manualmente;
- mover um workout para cima ou para baixo;
- avançar para o próximo workout;
- voltar para um workout anterior;
- pular o workout atual;
- escolher um workout aleatório pendente;
- iniciar novamente um workout já concluído quando desejar;
- visualizar qual workout está pendente, concluído ou pulado.

A sequência não deve impedir o usuário de treinar de acordo com sua realidade. O usuário pode fazer cada workout diariamente, ocasionalmente ou pular dias. Não assumir que ele treinará todos os dias sem interrupção.

Registrar cada conclusão e cada salto com data e hora. Não apagar histórico quando a ordem dos workouts for alterada.

## 7. Tela de execução do workout

A tela de execução é a parte mais importante do produto. Ela deve ser desenhada para uso durante o treino, com o celular na mão e atenção limitada.

Durante a execução:

- bloquear a rolagem global da página;
- impedir que toques acidentais movam a página inteira;
- evitar headers promocionais, menus grandes, sidebars e controles secundários;
- manter apenas os controles essenciais;
- permitir rolagem vertical interna somente dentro da área do conteúdo se o workout não couber na altura disponível;
- impedir rolagem horizontal;
- manter o layout estável durante cliques e toques;
- preservar foco visível e acessibilidade;
- permitir operação com teclado quando utilizado em desktop;
- respeitar `prefers-reduced-motion`.

A estrutura visual deve ser semelhante a:

1. barra superior extremamente compacta, com botão voltar, identificação mínima do aplicativo e indicação “Treino em execução”;
2. indicador compacto de progresso, como “Workout 2 de 4” e “1 concluído”;
3. cabeçalho do workout com nome, nível e metadados essenciais;
4. corpo principal com seções e exercícios;
5. rodapé compacto com “Marcar como concluído” e “Pular”;
6. ação “Próximo” fora do conteúdo principal somente se ela não prejudicar a área útil.

No celular, o cabeçalho deve ocupar aproximadamente 10% ou menos da altura útil quando possível. O rodapé deve ser compacto, aproximadamente 10% ou menos da altura útil quando possível. O conteúdo do workout deve ocupar a maior área da tela.

Não usar cabeçalhos altos, banners, cards promocionais, navegação lateral ou rodapés grandes na tela de execução. O workout inteiro deve aparecer na tela sempre que possível. Quando não couber, a rolagem deve ocorrer apenas dentro do corpo do workout, nunca na página inteira.

## 8. Compactação visual obrigatória

A interface deve ser elegante, mas compacta. Priorizar densidade de informação e legibilidade sobre espaços decorativos excessivos.

No modo mobile:

- reduzir altura do header;
- remover subtítulos e descrições redundantes do cabeçalho durante a execução;
- usar tipografia clara e compacta;
- reduzir padding dos cards;
- reduzir margens entre seções;
- manter linhas de exercícios curtas;
- colocar prescrição e demonstração na mesma linha quando houver espaço;
- usar botões com altura suficiente para toque, mas sem ocupar espaço desnecessário;
- usar `min-height: 0` em containers flexíveis;
- usar `overflow-y: auto` somente no corpo do workout;
- usar `overscroll-behavior: contain` no conteúdo rolável;
- manter o rodapé com altura limitada e previsível;
- verificar o resultado em pelo menos 320px, 375px, 390px, 430px e 768px de largura.

Não resolver falta de espaço simplesmente aumentando o zoom negativo ou tornando o texto ilegível. Se o workout for muito longo, preservar a legibilidade e permitir rolagem interna controlada.

## 9. Exibição dos exercícios

Cada exercício deve apresentar, quando disponível:

- nome;
- quantidade;
- séries;
- repetições;
- tempo;
- carga;
- distância;
- nota ou observação;
- botão “Ver demonstração”.

As informações devem ser organizadas para leitura rápida. Evitar parágrafos longos no meio da execução. Textos extensos podem aparecer em uma área secundária ou expansível.

## 10. Demonstrações visuais

Cada exercício pode ter uma demonstração visual opcional. A demonstração deve aparecer somente quando o usuário tocar em “Ver demonstração”. Não ocupar espaço significativo antes de ser solicitada.

As demonstrações podem ser imagens, ilustrações ou stickers gerados por IA em estilo consistente. Quando não houver demonstração específica, mostrar um fallback visual honesto e claramente identificado. Não afirmar que uma imagem representa exatamente a execução técnica se ela for apenas uma referência genérica.

A demonstração deve abrir em modal ou camada interna controlada, sem quebrar o viewport travado. O modal deve possuir:

- fechamento explícito;
- botão de fechar acessível;
- `role="dialog"` e `aria-modal="true"`;
- foco controlado;
- rolagem interna própria quando necessário;
- descrição textual do exercício;
- suporte a teclado e toque.

## 11. Histórico de sessões

O usuário deve conseguir consultar os workouts já realizados. Para cada sessão, registrar:

- workout executado;
- data e horário;
- status: concluído ou pulado;
- snapshot do nome e da estrutura executada, para que alterações futuras no workout não destruam o contexto histórico;
- observações futuras, se essa funcionalidade for adicionada.

O histórico deve possuir uma interface simples, legível no celular e ordenada do mais recente para o mais antigo.

## 12. Gerenciamento e edição

Criar uma tela de gerenciamento onde o usuário possa:

- listar todos os workouts;
- criar um workout manualmente;
- editar nome, descrição, nível e data sugerida;
- editar seções;
- adicionar, remover e reordenar exercícios;
- editar séries, repetições, tempo, carga, distância e notas;
- excluir workouts com confirmação;
- importar outro PDF;
- visualizar a origem de um workout importado.

O editor deve validar campos obrigatórios e mostrar erros próximos dos campos. Não salvar payload incompleto ou malformado. A interface de edição pode ser mais espaçosa que a tela de execução, pois seu objetivo é gerenciamento, não treino.

## 13. Design visual

Usar um design elegante, sóbrio e funcional, com aparência de ferramenta pessoal premium. A interface deve funcionar bem em tema claro ou escuro, mas o modo de execução deve priorizar contraste e legibilidade.

Diretrizes:

- paleta neutra com uma cor de destaque quente, como laranja/coral;
- tipografia forte para nomes de workouts;
- contraste adequado entre texto e fundo;
- bordas e sombras discretas;
- cantos arredondados moderados;
- animações curtas e não essenciais;
- estados de loading, vazio, erro e sucesso claros;
- foco visível para navegação por teclado;
- botões com alvos de toque confortáveis;
- nenhuma informação importante deve depender apenas de cor.

Evitar uma estética genérica de dashboard cheia de cards, métricas e elementos decorativos. A tela de execução deve parecer uma ferramenta de treino, não um painel administrativo.

## 14. Arquitetura técnica sugerida

Se o projeto existente já usa React, TypeScript, Tailwind, tRPC, Drizzle e banco relacional, preservar essa arquitetura. Usar procedimentos tipados para comunicação entre frontend e backend. Manter a lógica de seleção de workouts em funções puras e testáveis.

Separar claramente:

- componentes de apresentação;
- estado da tela de execução;
- seleção de workout;
- validação de payloads;
- persistência;
- importação e processamento de PDF;
- integração com LLM;
- geração ou armazenamento de imagens;
- histórico de sessões.

Não colocar toda a lógica em um único componente de página. Dividir componentes quando isso melhorar manutenção, mas evitar abstrações excessivas que dificultem entender a tela principal.

## 15. Testes obrigatórios

Antes de considerar qualquer mudança concluída:

- executar os testes existentes;
- adicionar testes para toda nova regra de negócio;
- testar autenticação e isolamento por usuário;
- testar seleção aleatória sem repetição imediata;
- testar conclusão e salto de workout;
- testar reordenação;
- testar validação de importação do PDF;
- testar resposta malformada da IA;
- testar criação e edição de seções e exercícios;
- testar que somente o corpo do workout possui rolagem interna;
- testar que `workout-mode` bloqueia overflow global;
- testar que header e footer são flexíveis, compactos e não empurram o conteúdo;
- testar contratos CSS/estrutura para mobile e desktop;
- testar abertura e fechamento da demonstração;
- testar acessibilidade mínima dos botões e diálogos.

Exigir evidência verificável. Screenshots são úteis, mas não substituem testes automatizados. Todo ajuste visual importante deve ser conferido em viewport mobile e desktop.

## 16. Critérios de aceitação

Considere o trabalho aprovado somente quando todos os critérios abaixo forem verdadeiros:

1. Ao entrar autenticado, o usuário vê imediatamente um workout disponível.
2. O usuário consegue importar um PDF e revisar o resultado estruturado antes de salvar.
3. O sistema mantém workouts, seções, exercícios e sessões persistidos.
4. O usuário consegue reordenar, avançar, voltar, pular e concluir workouts.
5. O botão “Próximo” seleciona outro workout de forma coerente e não fica preso ao primeiro item.
6. A tela de execução não permite rolagem global acidental.
7. O corpo do workout pode rolar internamente quando o conteúdo não couber.
8. Header e footer são compactos e deixam a maior parte da tela para os exercícios.
9. O workout é legível em celulares pequenos e grandes.
10. Demonstrações aparecem apenas quando solicitadas e não quebram a tela travada.
11. Histórico mostra as sessões realizadas com data, status e contexto do workout.
12. A edição manual permite corrigir qualquer informação importada.
13. Os testes automatizados passam sem falhas.
14. O build de produção passa sem erros.
15. O aplicativo publicado pode ser acessado pelo domínio configurado.
16. Nenhuma credencial, arquivo `.env`, segredo ou dado pessoal é incluído no pacote de código-fonte.

## 17. Processo de trabalho do agente

Siga esta ordem:

1. Inspecione a árvore do projeto, README, schema do banco, rotas, componentes principais, testes e logs recentes.
2. Execute os testes e o build antes de modificar o código.
3. Crie ou atualize um arquivo `todo.md` com tarefas verificáveis.
4. Corrija primeiro bugs de funcionalidade e regras de negócio.
5. Depois corrija a experiência mobile e a compactação visual.
6. Adicione testes antes ou junto de cada mudança relevante.
7. Execute novamente testes, build e validações visuais.
8. Confira que o modo de execução funciona sem rolagem global em diferentes tamanhos de tela.
9. Gere um pacote de código-fonte sem `node_modules`, logs locais, builds temporários e segredos.
10. Documente claramente o que foi alterado, o que foi testado e qualquer limitação que dependa do login ou de uma sessão real do usuário.

## 18. Prioridade máxima

Se houver conflito entre estética e usabilidade durante o treino, priorize usabilidade. O usuário não deve precisar ficar movimentando a página para cima e para baixo apenas para executar um workout. O software deve abrir o treino do dia rapidamente, mostrar o máximo possível em uma única tela, impedir movimentos acidentais e oferecer rolagem interna somente quando for realmente necessária.

A pergunta principal para avaliar cada alteração é:

> “Consigo pegar o celular, abrir o workout atual, enxergar claramente o que preciso fazer e registrar a conclusão sem lutar contra a interface?”

Se a resposta for não, simplifique o layout, reduza elementos secundários, compacte os espaçamentos ou melhore a rolagem interna antes de adicionar novas funcionalidades.
