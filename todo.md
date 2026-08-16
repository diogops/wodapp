# Project TODO

- [x] Criar modelo de dados persistente para workouts, exercícios, sequência e sessões concluídas
- [x] Implementar autenticação e acesso pessoal ao aplicativo
- [x] Implementar dashboard mobile-first com próximo workout em destaque
- [x] Implementar card padronizado com nome, data sugerida, exercícios, séries, repetições, tempo, nível e observações
- [x] Implementar sequência automática de workouts e indicação do próximo workout
- [x] Implementar conclusão de workout com data/hora e histórico de sessões
- [x] Implementar ação de pular workout mantendo o fluxo da sequência
- [x] Implementar navegação manual entre workouts e voltar nos workouts
- [x] Implementar reordenação manual por drag-and-drop e/ou botões mover para cima/baixo
- [x] Implementar tela de gerenciamento com listagem, edição, exclusão e criação manual
- [x] Implementar importação de PDF com upload seguro e armazenamento persistente
- [x] Implementar extração automática do PDF via LLM e conversão para o formato padronizado
- [x] Implementar revisão/confirmacão do conteúdo extraído antes de salvar
- [x] Implementar histórico detalhado de sessões realizadas
- [x] Aplicar design visual elegante, refinado, responsivo e acessível
- [x] Escrever e executar testes Vitest para os fluxos principais
- [x] Validar a aplicação no navegador em viewport desktop e mobile
- [x] Criar checkpoint final para habilitar a publicação

- [x] Calcular automaticamente o próximo workout pendente com base na ordem e no histórico
- [x] Avançar automaticamente para o próximo workout após concluir ou pular
- [x] Persistir sourceFileKey e sourceFileName no workout importado
- [x] Exibir detalhes/snapshot de cada sessão no histórico
- [x] Adicionar testes Vitest para criação, listagem, reordenação, sessões e importação
- [x] Expandir a edição para nível, data sugerida, seções e exercícios
- [x] Centralizar o cálculo do próximo workout pendente e usá-lo ao abrir o dashboard
- [x] Adicionar UI de edição completa para seções e exercícios, incluindo séries, repetições, tempo, carga e notas
- [x] Implementar editor visual estruturado para seções e exercícios com ações de adicionar, remover e reordenar
- [x] Adicionar campos dedicados e validação para nome, prescrição, séries, repetições, tempo, carga e notas
- [x] Tratar edição inválida explicitamente e bloquear salvamento de payload malformado
- [x] Adicionar controles de reordenação para seções e exercícios no editor visual
- [x] Adicionar campo dedicado para notas do exercício e persistir esse dado
- [x] Expandir a validação do editor para os campos de exercício e mostrar erros explicitamente

- [x] Incluir os workouts padrão do PDF enviado para cada usuário pessoalmente
- [x] Abrir o dashboard já com um workout do dia selecionado aleatoriamente
- [x] Fazer o botão Próximo selecionar outro workout aleatoriamente
- [x] Impedir fallback temporário para o primeiro workout antes da seleção aleatória inicial
- [x] Adicionar teste da lógica de seleção aleatória inicial com workouts seeded
- [x] Incluir explicitamente os testes client no escopo do Vitest e confirmar a execução do teste de seleção aleatória

- [x] Criar modo de treino mobile dedicado sem rolagem vertical ou horizontal acidental
- [x] Manter cabeçalho e workout visíveis em viewport fixo conforme a referência
- [x] Ajustar cards de seções e exercícios para leitura compacta no modo de treino
- [x] Validar toque, navegação e acessibilidade no modo travado
- [x] Adicionar foco visível, labels ARIA e status ao modo de treino travado
- [x] Criar teste verificável da navegação do modo de treino sem rolagem acidental
- [x] Registrar checklist manual de validação mobile do modo de treino

- [x] Adicionar demonstração visual opcional para cada exercício
- [x] Exibir a demonstração somente após toque em “Ver demonstração”
- [x] Definir fallback quando não houver imagem específica para o exercício
- [x] Garantir que imagens não quebrem o modo de treino sem rolagem acidental
- [x] Adicionar teste cobrindo modo Hoje, navegação e abertura da demonstração sem rolagem global
- [x] Cobrir todos os exercícios padrão com demonstração visual real ou fallback de geração robusto
- [x] Exibir a demonstração em área interna controlada para não aumentar o viewport travado
- [x] Criar teste de UI/contrato para abertura da demonstração, camada interna e shell travado sem scroll global

- [x] Corrigir corte do workout no viewport mobile
- [x] Manter cabeçalho e controles fixos enquanto apenas a área do workout pode rolar
- [x] Garantir que o card completo do workout, seções e exercícios sejam acessíveis no celular
- [x] Validar a correção em viewport mobile e desktop
- [x] Adicionar teste de contrato para workout-card-body com rolagem interna e footer de ações fixo
- [x] Validar visualmente a correção do modo de treino também em viewport desktop e registrar a verificação
- [x] Adicionar teste de contrato/UI que comprove a estrutura header/body/footer e que somente workout-card-body recebe rolagem interna
- [x] Adicionar asserções explícitas para garantir que somente workout-card-body tenha overflow/scroll interno
- [x] Executar pnpm test após fortalecer o contrato final do layout
- [x] Comprovar no teste que a classe workout-card-body contém overflow-y-auto no mesmo atributo
- [x] Reexecutar pnpm test após essa asserção final
- [x] Verificar no teste o mesmo atributo className do workout-card-body com overflow-y-auto de forma estrita
- [x] Reexecutar pnpm test após fortalecer essa verificação específica

- [x] Criar tela de execução dedicada ao abrir um workout, sem o cabeçalho promocional do dashboard
- [x] Mostrar o conteúdo do workout em área de leitura maximizada, sem card parcialmente escondido
- [x] Manter apenas controles essenciais fixos: voltar, demonstração, concluir, pular e próximo
- [x] Validar no domínio publicado em viewport de celular e corrigir qualquer diferença entre preview e produção
- [x] Remover controles extras do modo de execução e manter somente voltar, concluir, pular e próximo
- [x] Definir acesso à demonstração sem poluir a tela de execução
- [ ] Salvar novo checkpoint com a tela dedicada corrigida
- [ ] Validar diretamente o domínio publicado em viewport mobile
- [x] Ocultar a fila lateral e controles secundários em todos os breakpoints da tela dedicada
- [x] Validar novamente a tela dedicada em mobile e desktop após remover a fila

- [x] Reduzir o cabeçalho do modo de treino para uma barra compacta
- [x] Compactar título, metadados, seções e linhas de exercícios para caber mais conteúdo no celular
- [x] Manter rolagem vertical somente dentro do workout quando o conteúdo exceder a altura disponível
- [x] Validar que o rodapé de ações não ocupe espaço excessivo
- [x] Validar o modo compacto em viewport mobile e desktop
- [ ] Salvar novo checkpoint publicado da correção
- [x] Entregar o código-fonte completo para download

- [ ] Adicionar asserção verificável para limitar a altura do rodapé de ações no modo compacto
- [ ] Adicionar teste de contrato para as classes/estrutura do modo compacto mobile e desktop
- [ ] Fazer upload/anexar o ZIP do código-fonte e registrar o link acessível para download
