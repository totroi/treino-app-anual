import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dumbbell, 
  Calendar, 
  ChevronDown, 
  Save, 
  History, 
  Info, 
  RefreshCw,
  TrendingUp,
  Clock,
  Zap,
  CheckCircle2,
  FileText,
  Sparkles,
  RotateCcw, // Ícone para resetar o treino
  Check // Ícone de check simples
} from 'lucide-react';

/**
 * LINKS DOS DOCUMENTOS MENSAIS
 */
const MONTHLY_DOCS = {
  "Janeiro": "https://docs.google.com/document/d/1Rk8MvsPW_Es8weZ6yNiPvLK2IF1ZSc9KuwvRcQNMk0g/edit?usp=sharing",
  "Fevereiro": "https://docs.google.com/document/d/1KNjq9QURk1pzOzyA3TQ5dRaEY--NCSVuSrUHFeS0QDE/edit?usp=sharing",
  "Março": "https://docs.google.com/document/d/1YVTyj-h4feR2bnJvVTBVWnWIZ8pHkLsbyZESM-0Wnhs/edit?usp=sharing",
  "Abril": "https://docs.google.com/document/d/1o9iy8_NCTCRqgqqUouBNst73NQb3OW2ueKNx_dIM--M/edit?usp=sharing",
  "Maio": "https://docs.google.com/document/d/1_XfwEkvWvjLlfQ4ZcJdBIvZms7oK8XPIkMUECpefvDM/edit?usp=sharing",
  "Junho": "https://docs.google.com/document/d/1tBsZ71SC0evH-dYJmTzY4ri-TkGL2fsiAcX2QYyRsPs/edit?usp=sharing",
  "Julho": "https://docs.google.com/document/d/1_0BYS5HXXacYImF4Jod4RaYHP037uem5iqJN_om4zC0/edit?usp=sharing",
  "Agosto": "https://docs.google.com/document/d/1ElFv93J8FlCfp2hVWUStZDxhZTymIawPcSWgsS20YqU/edit?usp=sharing",
  "Setembro": "https://docs.google.com/document/d/1aGe-gluyurse9bjSenC7qhm6R_W4wVgTFmbEfiHz-wo/edit?usp=sharing",
  "Outubro": "https://docs.google.com/document/d/1YqeM3g5DoDof-w0VEDpcbaiiHMbxtU7geDVlXcWG1R4/edit?usp=sharing",
  "Novembro": "https://docs.google.com/document/d/1jDvZX8JuHVzrr72b85On6OP1gMobn0tBmQEYGg3ieaU/edit?usp=sharing",
  "Dezembro": "https://docs.google.com/document/d/1DB7OcpfK0iHNC2tq9DVEczigXBCTYpL7J6_xf-JcjpM/edit?usp=sharing"
};

/**
 * DADOS INICIAIS (Backup Offline)
 */
const INITIAL_CSV_DATA = `Mês,Grupo muscular,Especificação do grupo muscular,Treino,Exercício,Séries/Reps,Cadência,Técnica Avançada,Modo de execução,Observação
Fevereiro,Abdômen,Linha de Cintura,A/B/C,Vacuum (Vácuo),4 x 30 segundos,Estática,Isometria,"De joelhos ou em quatro apoios, expire todo o ar e contraia o abdômen para dentro o máximo possível, tentando 'encostar o umbigo nas costas'.",Essencial para reduzir o tamanho da cintura e melhorar o controle nas poses.
Fevereiro,Bíceps,Bíceps Braquial,B,Rosca Direta (Barra),5 x 8,2-2,Até a falha,Sem balanço ou 'cheat'. Esmague o bíceps no pico da contração; mantenha os cotovelos fixos ao lado do corpo.,Progredir 1-2kg por semana.
Fevereiro,Bíceps / Antebraço,Braquial e Braquiorradial,B,Rosca Martelo,4 x 10,2-2,Até a falha,Pegada neutra com punhos firmes. Foco no músculo braquial e no volume do antebraço.,Manter a forma técnica.
Fevereiro,Braços (Completo),Bíceps e Tríceps,C,Bi-Set: Rosca Alt. + Dips,5 x 10 cada,2-2,Bi-Set,Execute a Rosca Alternada e imediatamente as Paralelas (Dips) sem descanso. Foco no pump muscular extremo.,Sem descanso entre os exercícios.
Fevereiro,Costas,Lombar e Cadeia Posterior,B,Deadlifts (Levantamento Terra),3-5 x 5-10,2-2,Até a falha,"Pegue a barra no chão, mantenha a coluna selada e firme. Levante o peso usando a força das costas e pernas. Ancoragem total como catalisador do treino.",Treinar pesado uma vez por semana. Progredir 5kg por semana.
Fevereiro,Costas,Superior e Latíssimo,B,OPCIONAL Wide-Grip Chins to the Front,4 x máx.,2-2,Até a falha,"Segure a barra com pegada pronada larga. Puxe o corpo tentando tocar a parte superior do peito na barra, mantendo leve inclinação e roubo controlado para repetições extras.",Focar em alargar as costas e criar o arco lateral (sweep).
Fevereiro,Costas,Latíssimo do Dorso,B,Barra Fixa (Behind Neck),5 x máx.,2-2,Até a falha,Abra as dorsais e mantenha o peito aberto; realize a contração total no topo levando a barra por trás da nuca.,Adicionar peso se necessário.
Fevereiro,Costas,Espessura / Romboide,B,Remada Curvada,5 x 8-12,2-2,Rest-Pause,"Puxe a barra em direção ao abdômen mantendo a coluna selada. Na última série: falhe, descanse 15s e faça ao menos +3 reps.",Progredir 2-5kg por semana.
Fevereiro,Ombros,Deltoide e Trapézio,C,OPCIONAL Heavy Upright Rows,4 x 8-10,2-2,Cheating (Roubo),Segure a barra com mãos a 30cm de distância. Puxe até o queixo usando um leve balanço das costas e pernas para elevar o peso máximo. Cotovelos sempre acima da barra.,"Diferente da remada estrita, focar em potência e massa."
Fevereiro,Ombros,Deltoide Lat. / Post.,C,Press Behind Neck,5 x 8-10,2-2,Até a falha,Desenvolvimento por trás da nuca. Baixe até o nível das orelhas. Foco na expansão lateral.,Progredir 2kg por semana. Favorito de Reg Park.
Fevereiro,Ombros,Deltoide Lateral,C,Elevação Lateral,4 x 12-15,Controlada,Até a falha,"Controle o rebote. Eleve os halteres lateralmente até a altura dos ombros, mantendo o abdômen contraído.","Manter forma, foco na queimação."
Fevereiro,Peitoral,Massa Geral e Tríceps,A,Supino Reto (Barra),5 x 5-8,0-4,Repetições Parciais / Até a falha,"Executar movimentos de três quartos, tirando a barra do peito mas não subindo até o bloqueio total para manter tensão constante. Controle a excêntrica e exploda na concêntrica.",Inspirado na técnica de Sergio Oliva. Progredir 2-5kg por semana.
Fevereiro,Peitoral,Definição e Estriação,A,OPCIONAL Pec Deck (Voador),4 x 10-15,2-2,Contração Isométrica,"Sentado, alongue os peitorais ao máximo na extensão. Ao fechar os braços, realize uma contração isométrica extra no ponto de maior proximidade das mãos.",Excelente para criar definição e separar os músculos peitorais.
Fevereiro,Peitoral,Peitoral Superior,A,Supino Inclinado (Halter),4 x 8-10,2-2,Pico de contração,"Maximize a contração no topo do movimento, esmagando o peito. Mantenha os cotovelos para fora para isolar a parte superior.",Progredir 2kg por semana.
Fevereiro,Peitoral,Peitoral Inferior,A,Paralelas (Dips),5 x 10,2-2,Até a falha,Mantenha o tronco inclinado para frente e o queixo no peito para enfatizar o peitoral inferior; alongue o máximo na descida.,Adicionar peso conforme necessário.
Fevereiro,Pernas,Quadríceps e Glúteos,A,Squats (Agachamento),4 x 8 / 1 x 25,2-2,Método McCallum (Respiração Profunda),"Barra sobre os ombros, pés na largura dos ombros. Desça até abaixo da linha paralela. Na última série, método de respiração: 3 respirações entre reps 1-10, 6 entre 11-20 e 10 entre 21-25.",Faça respirações profundas na última série. Foco total na carga e resistência mental.
Fevereiro,Pernas,Massa e Potência,C,OPCIONAL Leg Press,4 x 10-15,2-2,Drop Sets,"Pés juntos na plataforma. Dobre os joelhos e desça o peso o máximo possível, trazendo os joelhos em direção aos ombros antes de empurrar de volta.",Focar no desenvolvimento da massa total das coxas.
Fevereiro,Pernas,Panturrilhas,C,Calf Raises (Standing),5-15 x 10-20,2-2,Priority Principle / Drop-sets,Suba na ponta dos pés o máximo possível. Alta intensidade com apenas 30 segundos de descanso. Pratique flexionar a panturrilha mesmo sem peso para controle.,"Se não conseguir manter as 10 reps com 30s de descanso, faça drop-sets."
Fevereiro,Pernas (Posterior),Isquiotibiais,B,Stiff (RDL),4 x 10-12,2-2,Até a falha,"Conexão mente-músculo absoluta. Desça a barra rente às pernas, sentindo o alongamento máximo dos isquiotibiais.",Progredir 2kg por semana.
Fevereiro,Pescoço,Músculos Cervicais,C,Wrestler’s Bridge,4 x 15-20,Lenta,Resistência Manual,Ponte de lutador. Use uma touca para proteção. Pode-se usar as mãos contra a testa/nuca para resistência adicional.,Pescoço grosso sinaliza poder.
Fevereiro,Tríceps,Tríceps (Medial/Lateral),A,Supino Fechado,5 x 8-10,2-2,Até a falha,Mãos posicionadas a 15cm de distância; mantenha os cotovelos raspando as costelas para focar na força bruta do tríceps.,Progredir 2kg por semana.
Fevereiro,Tríceps,Tríceps (Cabeça longa),A,Tríceps Testa,4 x 10-12,Lenta,Até a falha,Execução com cadência lenta; mantenha os cotovelos fechados e fixos. Baixe a barra até a testa ou ligeiramente atrás da cabeça.,Manter a forma técnica absoluta.
Março,Peitoral,Peitoral Geral,A,OPCIONAL Supino Reto (Bench Press),4 x 8-10,2-2,Movimentos de Três Quartos (Estilo Sergio Oliva),"Levante a barra do peito mas não bloqueie os cotovelos no topo, mantendo a tensão contínua no peitoral.",Evita o descanso do músculo e a entrada excessiva do tríceps.
Março,Peitoral,Parte superior,A,Supino Inclinado (Barra ou Máquina),4 x 8-12,2-2,Dropset na última série,"Qualidade total no movimento, focando na contração da parte superior.","Se seu máximo é 40kg/lado, use 30kg focando em qualidade total."
Março,Peitoral,Definição e Estriações,A,OPCIONAL Crucifixo em Máquina (Pec Deck),4 x 10-12,2-2,Contração Isométrica,"Trabalhe com alcance total de movimento, alongando ao máximo na extensão e dando uma contração isométrica extra ao fechar os braços.","Útil para criar definição, não focado em construção de massa bruta."
Março,Peitoral,Foco no alongamento,A,Crucifixo Reto (Halteres),4 x 10-12,Lenta na fase excêntrica,Até a falha,Alongamento extremo na fase excêntrica com halteres.,Foco no pico de alongamento.
Março,Costas,Costas Superior e Grande Dorsal,B,OPCIONAL Barra Fixa com Pegada Larga para Frente,4 x máx.,2-2,Cheating (Roubo) parcial quando cansado,"Segure a barra com pegada larga, puxe-se até tocar o topo do peito na barra, segure por um momento no topo e desça.",Permite um alcance de movimento ligeiramente maior e é menos rigoroso que atrás do pescoço.
Março,Costas,Largura (Dorsal),B,Puxada Alta (Lat Pulldown),4 x 8-12,2-2,Towel Pulls (Ativação prévia),Simular a puxada com toalha antes de usar o peso para preparar a musculatura.,"Se precisar, use straps. Não permita que a fadiga do antebraço limite suas dorsais."
Março,Costas,Espessura,B,Remada Baixa (Triângulo),4 x 10,2-2,Até a falha,Puxe o triângulo em direção ao abdômen com retração máxima das escápulas.,Foco no movimento escapular.
Março,Costas,Serrátil e Dorsal,B,Pull-over (Cabo ou Halter),3 x 12,Lenta no alongamento,Até a falha,Alongar ao limite máximo durante a fase excêntrica.,Sentir a dorsal e serrátil.
Março,Pernas,Quadríceps,B,OPCIONAL Agachamento (Squats),4 x 10-12,2-2,Até a falha,"Barra sobre os ombros, pés no chão ou calcanhares sobre bloco baixo, desça até as coxas ficarem abaixo do paralelo e suba.",Pode ser feito no Smith para estabilidade; Tom Platz é a referência de execução perfeita.
Março,Pernas,Quadríceps e Glúteos,C,OPCIONAL Leg Press,4 x 12-15,2-2,Até a falha,"Posicione-se na máquina, pés juntos, desça o peso trazendo os joelhos o mais próximo possível dos ombros.",O alcance deve ser o mais profundo possível para trabalhar o músculo completamente.
Março,Pernas,Foco Anterior (Finalizador),A,Leg Press 45º ou Cadeira Extensora,4 x 12-15,Execução lenta,Falha total,Movimento controlado e deliberado para esgotar o quadríceps.,Treinar até a exaustão absoluta.
Março,Pernas,Foco Posterior (Finalizador),B,Mesa Flexora ou Stiff,4 x 10-12,2-2,Forward Bends (Pós-treino),"Execução padrão do exercício escolhido; após o treino, realizar flexões de tronco para frente.","Pés juntos, pernas retas, segure nos tornozelos e puxe o tronco para baixo por 60 segundos."
Março,Ombros,Deltoides e Trapézio,A,OPCIONAL Remada Alta Pesada (Heavy Upright Rows),4 x 8-10,2-2,Cheating (Roubo),"Pegada com mãos a 30cm de distância, levante a barra até abaixo do queixo balançando as costas e ajudando com as pernas/panturrilhas.",Movimento de potência onde o roubo é vital para sobrecarga.
Março,Ombros,Deltoides,A,Desenvolvimento com Halteres (Sentado),4 x 8-12,2-2,Até a falha,Banco inclinado 1 grau para trás; halteres começam acima da linha do deltoide e sobem em linha reta.,"Cotovelos levemente para fora, empurre reto."
Março,Bíceps,Braços,C,Rosca Direta (Barra W),4 x 10,2-2,I Go/You Go,"Execução padrão com barra W, alternando as séries com um parceiro de treino.",Descanso limitado ao tempo do parceiro; desafio de intensidade mental.
Março,Tríceps,Braços,C,Tríceps Testa + Supinado,4 x 10 + 10,2-2,Bi-set,Usar a mesma barra para os dois movimentos sem descanso entre eles.,Executar um seguido do outro.
Março,Antebraço,Flexão de punho,C,Rosca de Pulso Inversa,3 x 15,2-2,Até a falha,Apenas flexão de punho inversa para segurança.,Evitar a Rosca Inversa tradicional.
Março,Panturrilhas,Finalizador,C,Gêmeos Sentado ou em Pé,15 x 10,Foco na contração de pico,Esquema de alta frequência,Extensão completa do tornozelo com foco na contração máxima no topo.,Conexão mente-músculo extrema; volume alto para choque muscular.
Março,Abdômen,Controle da Linha de Cintura,A/B/C,Vácuo Abdominal,3 x 20-30 seg.,Estática,Isometria Máxima,"De joelhos ou mãos e joelhos no chão, solte todo o ar e encolha o abdômen para dentro o máximo possível. Segure.",Reduz o tamanho da cintura e melhora o controle para as poses.
Abril,Peitoral,Peitoral Geral,A,OPCIONAL Supino Reto (Bench Press),3 x 8-12,2-1-3-1,Pico de contração,"Lifting da barra do peito sem estender totalmente os braços para manter a tensão constante, evitando que o tríceps assuma a carga.",Focar na exaustão total das fibras; técnica inspirada em Sergio Oliva.
Abril,Peitoral,Peitoral (ênfase em alongamento),A,Supino com Halteres,3 x 8-12,4-1-2,Negativas Controladas,Foco no alongamento profundo no final da fase excêntrica; arco de movimento superior à barra.,Usar Rest-pause na última série se necessário para exaustão total.
Abril,Peitoral,Definição e Estriações,A,OPCIONAL Crucifixo em Máquina (Machine Flys),3 x 12-15,2-2-4-2,Contração Isométrica Extra,"Executar com amplitude máxima, alongando na extensão e dando uma contração isométrica extra quando as mãos se aproximarem.","Utilizado para criar definição e estriações, não para massa bruta."
Abril,Peitoral,Peitoral completo e isolamento,A,Pec Deck (Voador),3 x 8-12,4-1-2,Contração Estática,Puxe os cotovelos o máximo possível para trás na fase inicial e esmague-os no centro.,Segurar a contração estática por 2 segundos no pico do movimento.
Abril,Ombros,Deltoide Lateral e Posterior,C,OPCIONAL Remada Alta Pesada (Heavy Upright Rows),4 x 6-10,2-1-2-1,Roubo (Cheating) controlado,Puxar a barra até o queixo mantendo cotovelos altos. Permitido balanço do corpo para usar cargas maiores.,Diferente da remada padrão; focar na potência do movimento e fase explosiva.
Abril,Braços,Bíceps (unilateral),A,Rosca Direta (Halteres),3 x 8-12,4-1-2,Negativas Controladas,Trabalho unilateral para permitir impulso contrátil mais forte do cérebro.,Foco mental total para forçar o recrutamento de fibras dormentes.
Abril,Pernas,Quadríceps,A,Leg Press,1-2 x Até a falha,2-2,Até a falha absoluta,Execução contínua até a falha total positiva para manter a demanda metabólica alta.,Utilizado como finalizador de perna para choque sistêmico.
Abril,Costas,Latíssimo do Dorso,B,OPCIONAL Barra Fixa com Pegada Larga (Wide-Grip Chins),4 x máx.,2-2-2-2,Até a falha,"Puxar o corpo até tocar a parte superior do peito na barra, permitindo um leve roubo quando a exaustão se aproximar.",Focar no alargamento das costas e no sweep do latíssimo.
Abril,Costas,Dorsal (Largura),B,Pulley Frente,3 x 8-12,4-1-2,Pré-exaustão (opcional),Puxe com os cotovelos e não com as mãos para isolar as costas.,"Se o bíceps falhar antes, use Pullover com halteres antes deste exercício."
Abril,Costas,Dorsal (Espessura),B,Remada Baixa,3 x 8-12,4-1-2,Contração Estática,Enfatize a contração estática no momento em que o suporte toca o abdômen.,Manter a tensão máxima sob dor extrema conforme a lógica do mês.
Abril,Costas/Geral,Eretores da espinha e sistêmico,B,Levantamento Terra (Deadlift),3 x 8-12,2-2,Até a falha,Execução técnica impecável; gera estímulo de crescimento sistêmico incomparável.,Considerado o melhor exercício geral para densidade.
Abril,Braços,Bíceps,A,OPCIONAL Rosca Direta com Barra Reta,3 x 8-12,3-1-3-1,Visualização (Mind-Muscle Connection),Movimento estrito focando em sentir o alongamento total na parte inferior e a contração completa no topo.,Visualizar os bíceps como montanhas gigantes para aumentar a intensidade mental.
Abril,Braços,Tríceps (Parte Inferior),B,OPCIONAL Extensão de Tríceps com Amplitude Parcial,3 x 12-15,2-1-2-1,Repetições Parciais,Executar apenas o terço inferior do movimento para isolar a área do cotovelo do tríceps.,Focar na queimação constante na parte inferior do músculo.
Abril,Braços,Tríceps (Parte Superior),B,OPCIONAL Coice-Extensão com Bloqueio (Lockout),3 x 10-12,2-4-2-1,Pico de contração (3-4 segundos),Bloquear totalmente os braços no topo da extensão e segurar a contração máxima por 3 a 4 segundos.,Trabalha a densidade da parte superior próxima ao deltoide.
Abril,Braços,Tríceps (Cabeça longa),B,French Press (Tríceps Francês),3 x 8-12,4-1-2,Negativas Controladas,Mantenha os cotovelos próximos às orelhas para isolar a cabeça longa.,Tríceps compõe 2/3 do braço; essencial para volume total.
Abril,Pernas,Posterior da coxa,B,Mesa Flexora,1-2 x Até a falha,4-4 (Negativa lenta),Negativas Controladas,Foco em alongamento profundo na fase negativa (descida).,Finalizador de perna no treino B.
Abril,Pernas,Quadríceps,C,OPCIONAL Agachamento (Squats),4 x 10-15,3-1-3-1,Pausas curtas (Under 60s),"Descer sob controle até logo abaixo do paralelo, manter a coluna reta e explodir na subida.",Utilizar um bloco baixo sob os calcanhares para melhor equilíbrio.
Abril,Pernas,Quadríceps (Vasto Medial/Lateral),C,OPCIONAL Leg Press,3 x 15-20,2-2-2-1,Amplitude Máxima,"Descer a plataforma o máximo possível, trazendo os joelhos quase até os ombros.",Focar no volume de repetições para exaustão cardiovascular e muscular.
Abril,Ombros,Deltoide completo,C,Desenvolvimento com Halteres,3 x 8-12,2-1-4,Negativas Controladas,Fase negativa (descida) obrigatoriamente de 4 segundos. Sem impulso/momentum.,Não usar o momentum para roubar o estímulo.
Abril,Ombros,Deltoide lateral,C,Elevação Lateral,3 x 8-12,4-1-2,Contração Estática,Pare 1 segundo no topo (pico de contração). Reduza carga se houver balanço.,Lei da Não-Contradição: não use o trapézio para balançar o peso.
Abril,Antebraço,Extensores do antebraço,C,Rosca Inversa,3 x 10-12,2-2,Até a falha,Execução controlada para evitar que o antebraço seja o 'elo fraco' em treinos de remada.,Não negligenciar este isolamento.
Abril,Pernas,Panturrilhas,C,OPCIONAL Elevação de Gêmeos (Calf Raises),5 x 15-20,2-2-2-2,Prioridade (Treinar no Início),Subir na ponta dos pés o máximo possível para contração total e descer até o alongamento máximo.,Treinar primeiro se forem um ponto fraco; focar no controle muscular.
Abril,Pernas,Gastrocnêmio,C,Gêmeos em Pé,3 x 12-15,2-2-2,Contração Estática,2 segundos de contração estática no topo (encurtamento máximo).,Finalizador de perna para o treino C.
Abril,Abdômen,Parede abdominal interna,C,Stomach Vacuum,3 x 30 seg.,Estática,Contração Estática,"Sugar o umbigo contra a coluna, de preferência em jejum ou ao final do treino.",Essencial para controle da cintura e suporte visceral.
Abril,Abdômen,Reto abdominal inferior,C,Hanging Leg Raises,3 x máx.,2-2,Exaustão total,Subir até os pés tocarem a barra para garantir contração total.,Foco na qualidade contrátil e exaustão total das fibras.
Maio,Peitoral,Geral / Massa,A,Supino Reto (Barra),4 x 6-10,2-2,Repetições parciais (3/4) / Dropset,Carga pesada e explosão controlada; evitar bloqueio articular no topo para manter tensão,Técnica de Sergio Oliva para densidade miofibrilar. Dropset na última série
Maio,Peitoral,Porção superior,A,Supino Inclinado com Halteres,4 x máx.,2-2,Dropset (na última série),Execução focada em preencher a porção superior do peito,Foco em densidade miofibrilar
Maio,Peitoral,Inferior e Médio / Definição,A,Mergulho em Paralelas (Dips),4 x máx.,2-2,Dropset (na última série),Inclinar o tronco para frente; sentir o alongamento na base e contração no topo,Essencial para a linha inferior do peito
Maio,Peitoral,Definição e Estriações,A,OPCIONAL Crucifixo em Máquina (Machine Flys),4 x 10-12,2-2,Contração Isométrica,Amplitude total com contração extra no final do movimento,Foco em criar estriações e separação muscular
Maio,Ombros,Deltoide lateral,C,Elevações Laterais Pesadas,Várias séries,Explosiva/Controlada,Princípio do Choque (Arnold),Começar com carga máxima e reduzir progressivamente sem descanso,"Técnica para ""fritar"" fibras laterais e crescimento estético"
Maio,Ombros,Deltoide e Trapézio,C,OPCIONAL Remada Alta Pesada (Heavy Upright Rows),4 x 8-10,2-2,Roubo (Cheating),"Pegada com mãos a 12 polegadas, puxada até o queixo com auxílio do corpo",Movimento de potência onde o 'roubo' é vital para densidade
Maio,Costas,Costas Superior (Lats),B,OPCIONAL Barra Fixa (Wide-Grip Chins),Até 50 reps totais,2-2,Roubo (Cheating),Tocar a parte superior do peito na barra,Permite roubar levemente quando fatigado para manter o sweep dos lats
Maio,Costas,Espessura Máxima,B,Remada Curvada com Barra,4 x máx.,2-2,Rest-pause,Inclinação de 45 graus para atingir o latíssimo,Remadas dão a densidade granítica ao físico
Maio,Costas,Largura (V-Shape),B,Puxada Alta (Lat Pulldown),4 x máx.,2-2,Até a falha,Puxada focada na expansão da moldura lateral,Puxadas dão a moldura em V
Maio,Pernas,Quadríceps,A,OPCIONAL Agachamento Livre,5 x 10-15,2-2,Até a falha,Pés sobre bloco baixo sob calcanhares; descer coxas logo abaixo da paralela,Garantir que o músculo faça o trabalho sem rebote
Maio,Pernas,Quadríceps Inferior,A,Leg Press,4 x 12-15,2-2,Repetições parciais (3/4),Amplitude total na descida e subida até 3/4 do caminho,Foco na musculatura logo acima do joelho
Maio,Pernas,Bíceps femoral,B,Stiff ou Mesa Flexora,4 x máx.,Alongamento controlado,Até a falha,Sentir o músculo sendo esticado sob tensão mecânica extrema,Finalizador para resposta hormonal sistêmica
Maio,Braços,Bíceps,B,Rosca Direta com Barra Reta,4 x 8-10,2-2,I Go / You Go,Alternar séries sem descanso com parceiro; execução estrita sem balanço,Pilar do treino de bíceps para choque muscular e intensidade
Maio,Braços,Braquial / Antebraço,B,Rosca Martelo (Hammer Curls),4 x máx.,2-2,Até a falha,Pegada neutra; protege os tecidos do antebraço,Permite treinar pesado mesmo com fadiga nos flexores
Maio,Braços,Tríceps (Massa),A,Tríceps Testa (Skull Crushers),4 x 10-12,2-2,Flexão e Pose Isométrica,Realizado com barra W ou halteres; flexionar entre as séries,Focado em construir massa de ferro e densidade de 'ferradura'
Maio,Braços,Tríceps (Pico),A,Triceps Kickback (Coice),4 x máx.,2-2,Até a falha,Busca de contração de pico máxima; baixo estresse articular,Usado para finalizar o treino sem sacrificar cotovelos
Maio,Braços,Bíceps e Tríceps,C,Super-set: Rosca Alternada + Extensão Polia,4 x máx.,2-2,Super-set,Transição imediata entre exercício de bíceps e tríceps,Maximiza a pressão interna e a expansão da fáscia
Maio,Panturrilhas,Gêmeos,C,Calf Raise (Gêmeos) em pé ou sentado,15 x 10,2-2,Volume Brutal,Foco em volume e frequência para fibras teimosas,Necessário para atingir densidade buscada no ciclo
Junho,Peitoral,Superior (Porção Clavicular),A,Supino Inclinado (Barra ou Halteres),4 x 10-12,2-2,Rest-Pause (15s),"Deitado em banco inclinado (30 a 45 graus), descer o peso até o topo do peito e empurrar focando na contração superior.",Foco no preenchimento da moldura superior e porção clavicular. Foco na contração.
Junho,Abdômen,Controle de Linha de Cintura / V-Taper,A/B/C,Vácuo Abdominal (Stomach Vacuum),4 x 30s a máx.,Isométrica,Até a falha,"Em jejum, expulse todo o ar e sugue o abdômen para dentro das costelas o máximo possível, mantendo a posição.",Essencial para reduzir a linha de cintura e melhorar o controle muscular em poses.
Junho,Peitoral,Definição e Estriamento,A,OPCIONAL Crucifixo em Máquina (Pec Deck),4 x 12-15,3-1-3,Contração Isométrica,"Traga os braços ao centro, realize uma contração isométrica extra no pico e alongue totalmente no retorno.",Foco total no estriamento muscular; evite excesso de peso para manter a amplitude.
Junho,Ombros,Deltoide Lateral e Trapézio,C,OPCIONAL Remada Alta Pesada (Heavy Upright Row),4 x 8-10,2-2,Cheating (Roubo) controlado,"Segure a barra com pegada de 30cm, levante até o queixo usando um leve impulso das costas e pernas.",Variação de potência; o roubo controlado é vital para sobrecarregar a musculatura.
Junho,Costas,Latíssimo (Largura / V-Taper),B,OPCIONAL Barra Fixa com Pegada Larga para Frente,4 x máx.,2-2,Até a falha,"Puxe o corpo tentando tocar a parte superior do peito na barra, mantendo os cotovelos para fora.",Permite leve roubo no final da série para garantir a amplitude máxima.
Junho,Membros Inferiores,Quadríceps,A,OPCIONAL Agachamento (Squat),4 x 10-12,3-2,Até a falha,"Desça com a coluna reta até as coxas passarem da linha paralela, empurre com os calcanhares.",Utilize um bloco sob os calcanhares se necessário para melhorar o equilíbrio e o foco nas coxas.
Junho,Braços,Tríceps (Definição),C,OPCIONAL Kickbacks com Halteres,4 x 12-15,2-2,Pico de Contração,"Mantenha o braço fixo ao lado do tronco e estenda o antebraço para trás, contraindo totalmente no final.","Ideal para sensibilidade no cotovelo, pois a carga máxima ocorre no fim do arco."
Junho,Peitoral,Alongamento e Detalhamento,A,Crucifixo Reto,3 x 12-15,3-1-2,Foco no alongamento,"Deitado em banco reto, abra os braços lateralmente com cotovelos flexionados e feche sentindo o peitoral.",Priorizar a conexão mente-músculo e a amplitude de movimento total.
Junho,Peitoral,Borda Externa,A,Dips (Paralelas),3 x máx.,2-2,Até a falha,"Suspenda o corpo, incline o tronco à frente e desça até o alongamento máximo da borda externa.",Foco específico no detalhamento da borda externa do peitoral.
Junho,Pernas,Quadríceps (Anterior),A,Leg Press ou Cadeira Extensora,4-5 x 15-20,2-0-2,Pump/Saturação,Execução com alto volume para buscar bombeamento sanguíneo e saturação das fibras.,Objetivo de fluxo sanguíneo máximo após o treino de peitoral.
Junho,Dorsais,Largura (V-Taper),B,Puxada Alta (Lat Pulldown),4 x máx.,2-2,Até a falha,Maximize o alongamento na fase excêntrica e realize o fechamento escapular total na concêntrica.,Essencial para criar o formato em 'V' das costas.
Junho,Dorsais,Espessura Média,B,Remada Curvada,4 x 10-12,2-1-2,Até a falha,"Tronco inclinado, puxe a barra ao abdômen mantendo a coluna estável e escápulas retraídas.",Foco na densidade e espessura da região média das costas.
Junho,Dorsais,Simetria Bilateral,B,Remada Unilateral (Serrote),3 x 10-12,2-1-2,Até a falha,"Apoiado em banco, puxe o halter lateralmente ao tronco com foco na contração do grande dorsal.",Garante o equilíbrio de volume e força entre os dois lados do corpo.
Junho,Bíceps,Sinergia de Braços,B,Rosca Direta (Barra W ou Reta),3 x 10,2-0-2,Até a falha,"Em pé, segure a barra com pegada supinada e flexione os braços com cotovelos fixos ao tronco.",Trabalho sinergista para completar o estímulo dos exercícios de puxar.
Junho,Pernas,Isquiotibiais (Posterior),B,Mesa Flexora ou Stiff,4 x 12,3-1-2,Alongamento profundo,Sinta o alongamento dos isquiotibiais na fase excêntrica e contração máxima na concêntrica.,Vital para a profundidade lateral do físico.
Junho,Braços,Bíceps e Tríceps,C,Super-série 1: Rosca Alternada + Tríceps Testa,4 x 10-12,2-2,Super-série,Alternar rosca com halteres em pé e tríceps testa sem descanso entre os exercícios.,Maximiza o fluxo sanguíneo e a vascularização nos braços (Arm-Day).
Junho,Braços,Detalhes de Bíceps e Tríceps,C,Super-série 2: Rosca Concentrada + Tríceps Pulley,4 x 12-15,2-1-2,Super-série,Executar rosca concentrada sentada seguida imediatamente por tríceps na polia alta.,Foco no refinamento da simetria e pico de contração dos braços.
Junho,Antebraço,Densidade do Braço,C,Rosca Inversa,3 x máx.,2-0-2,Até a falha,"Pegada pronada na barra, flexionando o cotovelo para trabalhar o braquiorradial.",A densidade do antebraço é o selo de um físico potente e completo.
Junho,Pernas,Panturrilhas,C,Elevação de Gêmeos,5 x 15-20,2-2-2,Alto Volume,Alongamento total na base e contração de pico no topo por 2 segundos.,Execução controlada para maximizar o tempo sob tensão (Estilo Arnold).
Julho,Peitoral,Peitoral Geral / Superior,A,OPCIONAL Supino Reto (Bench Press),4 x máx.,2-2,Até a falha,"Tirar a barra do peito, mas não subir totalmente (movimento 3/4).",Técnica de Sergio Oliva para manter o peito sob tensão constante sem descanso do tríceps.
Julho,Ombros,Deltoides,C,OPCIONAL Arnold Press,4 x máx.,2-2,Drop-sets,Pressionar os halteres girando os pulsos para envolver todas as cabeças do deltoide.,Usar o princípio do choque de reduzir o peso rapidamente entre as séries para aumentar a intensidade.
Julho,Costas,Latíssimo do Dorso,A,OPCIONAL Barra Fixa com Pegada Larga ao Peito,50 reps totais,2-2,Roubo (Cheating),Puxar tocando o topo do peito na barra; permite um leve roubo para continuar após a fadiga.,Focar em alargar a parte superior das costas e criar o sweep lateral.
Julho,Peitoral,Definição Peitoral,A,OPCIONAL Crucifixo em Máquina (Machine Flys),4 x máx.,2-2,Isometria,Amplitude máxima de movimento; dar uma contração isométrica extra quando os braços estiverem próximos.,Útil para criar estriações e definição no músculo peitoral.
Julho,Pernas,Quadríceps,A,OPCIONAL Agachamento (Squats),4 x 8-12,2-2,Fase Negativa Forçada,"Descer sob controle até logo abaixo da paralela, sem quicar no fundo.",Pode usar um bloco sob os calcanhares para melhor equilíbrio e foco no quadríceps.
Julho,Ombros,Trapézio / Deltoide Medial,C,OPCIONAL Remada Alta Pesada (Heavy Upright Rows),4 x máx.,2-2,Roubo (Cheating),Puxar a barra até o queixo usando balanço das pernas e costas para mover cargas pesadas.,Diferente da remada alta estrita; o roubo é parte vital deste movimento de potência.
Julho,Braços,Bíceps,B,OPCIONAL Rosca Direta com Barra Reta,4 x máx.,2-2,I Go / You Go,Execução estrita com visualização de montanhas nos bíceps; contração completa no topo.,Alternar séries sem descanso com o parceiro para choque muscular extremo.
Julho,Braços,Tríceps,B,OPCIONAL Coice com Halteres (Triceps Kickbacks),4 x máx.,2-2,Até a falha,Estender o braço para trás mantendo o cotovelo fixo; focar na contração final.,"Ideal para quando há dores articulares, pois o estresse é maior apenas no fim da extensão."
Julho,Abdômen,Parede Abdominal,A/B/C,Vácuo de Estômago (Vacuum),3 x 20-30 seg.,Estática,Isometria,Expulsar todo o ar e sugar o abdômen o máximo possível enquanto está de joelhos.,Reduz a linha de cintura e melhora o controle muscular para poses.
Julho,Costas,Lombar,A,OPCIONAL Hiperextensões,4 x 15,2-2,Até a falha,Movimento de amplitude total para fortalecer os eretores da espinha.,"Essencial para estabilização, mas requer cuidado para não sobrecarregar."
Julho,Peitoral,Isolamento de peitorais,A,Pec Deck,1 x 6-10,2-2,Contrações Estáticas,Até a falha momentânea estrita. Realizar contrações estáticas no ponto de encontro das mãos.,Único exercício que permite contração total do peitoral no pico.
Julho,Peitoral / Deltoide,Peitoral e deltoide anterior,A,Dips (Paralelas),1 x 6-10,Negativas,Repetições Negativas,Inclinar o corpo para frente e manter os cotovelos para fora (flare).,Foco no peitoral e deltoide anterior.
Julho,Costas,Latíssimos e escápulas,A,Puxada na Frente / Remada,1 x 6-10,2-2,Até a falha,Foco na contração escapular total.,Base de densidade para as costas.
Julho,Bíceps,Conexão mente-músculo,B,Rosca Concentração,1 x 6-10,2-2,Supinação forçada,"Supinar o pulso ao máximo no final, tocando a placa do haltere no deltoide oposto.",Nuance de Mentzer para pico de bíceps.
Julho,Tríceps,Cabeça lateral e densidade,B,Extensão de Tríceps (Cabo/Máquina),1 x 6-10,7-10s (Excêntrica),Repetições Negativas,Focando em negativas lentas e controladas.,Prioridade na conexão mente-músculo.
Julho,Ombros,Deltoides (Geral),C,Desenvolvimento (Military Press),1 x 6-10,2-2,Até a falha,Movimento composto para densidade global do tronco.,Refinamento de tronco.
Julho,Ombros,Deltoide lateral,C,Elevações Laterais,1 x 6-10,2-2,Rest-Pause,"Carga máxima para 1 rep, descansa 10 seg, executa a segunda, reduz carga em 10%.",Uso da técnica de choque para romper o limiar neurológico.
Julho,Abdominais,Serratus e contração máxima,C,Abdominais (Kneeling Pose),1 x 6-10,Estática,Contração Estática,Foco na contração máxima e controle do serratus.,Trabalho de refinamento do tronco.
Julho,Pernas,Quadríceps,A,Cadeira Extensora,4 x máx.,2-2,Pico de Contração,Manter a carga estática na posição de encurtamento total pelo máximo de tempo.,Garante resposta hormonal sistêmica.
Julho,Pernas,Posteriores,B,Leg Curl,4 x máx.,10s (Descida),Repetições Negativas,Controle fluido da descida para evitar lesões nos joelhos.,Não-negociável se não houver levantamento terra.
Julho,Pernas,Panturrilhas,C,Gêmeos Sentado ou em Pé,4 x máx.,2-2,Rest-Pause,"Execução com carga máxima, pausa de 10 segundos entre micro-séries.",Estresse sistêmico para elevar hormônios anabólicos.
Agosto,Peitoral,Peitoral Maior,A,OPCIONAL Supino Reto com Barra,1-2 x 6-10,4-2-4,Até a falha,"Lento e deliberado, com contração máxima no topo.",Focar na conexão mente-músculo e evitar o descanso no topo conforme Mike Mentzer.
Agosto,Peitoral,Peitoral Superior / Clavicular,A,Supino Inclinado com Halteres,1-2 x 6-10,4-1-4,Até a falha (Rest-Pause ou Forced Reps),"Movimento semicircular, alongando bem a fibra no fundo; execução lenta sem trancos.",Inspirado na abordagem de isolamento para contornos ideais; inicia o treino para preencher o aspecto quadrado.
Agosto,Peitoral,Isolamento total,A,Pec Deck,1-2 x 6-10,4-0-2-1,Negative Failure (4-6s descida),Permite contração total no pico onde os braços se cruzam.,Único que permite contração total na posição de pico segundo Mentzer.
Agosto,Costas,Latíssimo do Dorso,B,OPCIONAL Pullover na Máquina,1-2 x 8-12,4-2-4,Pausa-Descanso,"Amplitude total de movimento, focando no alongamento dorsal.","Mike Mentzer considerava o pullover o ""agachamento para o tronco""."
Agosto,Costas,Espessura das Costas,B,OPCIONAL Remada Curvada com Barra,1-2 x 6-10,2-2-4,Até a falha,"Tronco paralelo ao chão, puxando a barra contra o abdômen.",Manter a coluna estável; técnica de contração de pico no topo.
Agosto,Braços,Bíceps Braquial,A,Rosca Direta (Barra Reta/E-Z),1-2 x 6-10,4-2-4,Repetições Negativas Forçadas / Drop-sets,"Uso de barra reta para garantir a função de supinação; visualização de ""montanhas"" conforme Arnold.",Focar na fase excêntrica lenta; barras W podem comprometer a ativação neurológica primária.
Agosto,Braços,Tríceps Braquial,A,Tríceps no Pulley (Barra Reta),1-2 x 8-12,4-2-4,Contração Isométrica,Manter cotovelos fixos; extensão deliberada focando no antagonismo com o bíceps.,Segurar a contração por 3 segundos; alternar com bíceps para aproveitar o fluxo sanguíneo.
Agosto,Pernas,Quadríceps,A,Cadeira Extensora,1-2 x 12-15,2-0-2-0,Até a falha positiva,Movimento contínuo sem descanso no topo para manter a tensão.,Finalizador de perna; proibido falha negativa extrema para segurança articular.
Agosto,Pernas,Quadríceps,A,Leg Press,1-2 x 12-15,2-2,Até a falha positiva,Descer apenas até a lombar não descolar do banco.,Exercício multiarticular de alta resposta hormonal.
Agosto,Dorsais,Largura (V-Taper),B,Pulldown supinado,1-2 x 6-10,4-0-2-0,Forced Reps,Pegada supinada para envolver o bíceps na posição mais forte.,Permite levar as dorsais a um nível de falha muito mais profundo.
Agosto,Dorsais,Espessura e Potência,B,Levantamento Terra (Deadlift),1 x 5-8,Lenta/Controlada,Falha Concêntrica Estrita,O solo não é um trampolim; execução lenta da saída ao topo.,O rei da potência sistêmica; trabalha dos eretores aos trapézios.
Agosto,Ombros,Deltoide Lateral,B,OPCIONAL Elevação Lateral com Halteres,1-2 x 8-12,4-2-4,Repetições Parciais,"Elevação até a altura dos ombros, palmas para baixo.","Utilizar ""burns"" (repetições curtas) após a falha total conforme HIT."
Agosto,Ombros,Deltoide Anterior,B,Desenvolvimento Militar,1-2 x 6-10,2-2-2,Até a falha,"Execução estrita, sem impulso com as pernas.",Princípio da prioridade para grupamentos estagnados.
Agosto,Pernas,Isquiotibiais,B,Mesa Flexora ou Stiff,1-2 x 8-12,4-2-4,Dropset,Movimento fluido; foco na densidade posterior para profundidade lateral.,Frequência reduzida para recuperação; manter a falha no domínio concêntrico.
Agosto,Braços,Bíceps Braquial,C,Rosca Direta (Refinamento),1-2 x 6-10,3-1-3-1,Peak Contraction,Manter a contração máxima por 1 segundo em cada repetição.,"Foco na tridimensionalidade, largura frontal e pico do bíceps."
Agosto,Braços,Tríceps Braquial,C,Tríceps Pulley (Refinamento),1-2 x 6-10,3-1-3-1,Peak Contraction,Espremer o músculo contra a resistência no ponto máximo.,Busca a falha concêntrica absoluta para detalhamento.
Agosto,Pernas,Quadríceps,C,OPCIONAL Agachamento Livre (Barra),1-2 x 12-20,4-4-4,Até a falha,"Descida controlada até abaixo da paralela, calcanhares fixos.",Pode ser usado um calço sob os calcanhares para melhor equilíbrio.
Agosto,Adutores,Largura da Coxa,C,Cadeira Adutora,1-2 x 12-15,2-2,Até a falha,Preenchimento do espaço interno da coxa.,Fundamental para a largura da coxa em poses frontais.
Agosto,Panturrilhas,Gastrocnêmio,C,Elevação de Gêmeos em Pé,1-2 x 15-20,2-4-2,Pausa-Descanso,Alongamento máximo no fundo e contração de pico no topo; sem inércia.,Panturrilhas exigem alta intensidade; pausa deliberada nos extremos.
Agosto,Abdômen,Parede Abdominal,C,Vacuum (Vácuo Estomacal),3 x 30 seg.,Estática,Isometria,Expulsar todo o ar e sugar o abdômen para dentro.,Essencial para controle de linha de cintura e estética clássica.
Setembro,Peitoral,Densidade Geral,A,Bench Press (Supino Reto),5 x 5 a 8,2-2,"Rest-Pause (na última série: falha, 15s de descanso, reps máx; repetir 1x)","Deitado no banco, baixar a barra até o peito e empurrar. Retrair as escápulas e usar 85-90% da RM.",Construtor de densidade miofibrilar. Sergio Oliva usava movimentos de 3/4 para manter tensão constante.
Setembro,Costas,Parte superior / Latíssimo,B,OPCIONAL Wide-Grip Chins (Barra fixa pegada aberta),4 x máx.,2-2,Até a falha,Puxar o corpo para cima tentando tocar a parte superior do peito na barra.,Tocar o peito na barra permite maior amplitude e permite 'roubar' levemente para reps extras.
Setembro,Pernas,Quadríceps (Efeito Sistêmico),A,Squats (Agachamento Livre),1 x 20,2-2,Breathing Squats (3-6-10 respirações entre reps),Carga para 12 reps. Descer até as coxas ficarem abaixo da linha paralela. 3 respirações entre reps 1-10; 6 entre 11-15; 10 entre 16-20.,Obriga o corpo todo a crescer através do efeito sistêmico. Usar bloco sob calcanhares pode melhorar equilíbrio.
Setembro,Peitoral,Porção Superior,A,Supino Inclinado (Halteres),4 x 10,2-2,Até a falha,Realizar contração máxima no topo do movimento.,Foco no detalhamento da porção superior e densidade.
Setembro,Peitoral,Expansão Torácica,A,Crucifixo Reto / Machine Flys,4 x 12-15,2-2,Respiração Profunda McCallum,Inspirar o máximo possível enquanto desce para expandir as costelas. Contrair isoladamente no centro.,Técnica focada na expansão da caixa torácica e contrações isométricas extras no Pec Deck.
Setembro,Costas,Lombar,B,OPCIONAL Deadlifts (Levantamento Terra),3 x 10,2-1,Até a falha,Tirar o peso do chão mantendo as costas seladas até a posição ereta.,Treinar pesado para lombar apenas uma vez por semana devido ao tempo de recuperação.
Setembro,Costas,Espessura (Romboides),B,Remada Curvada,5 x 8,2-2,Rest-Pause (mesmo protocolo do Supino),"Tronco firme, sem balanço (efeito iô-iô). Puxar para esmagar os romboides.",Exercício Padrão-Ouro para construir espessura de 'casco de tartaruga'.
Setembro,Costas,Força Real / V-Taper,B,Barra Fixa (Chins behind neck),5 x até a falha,2-2,Sobrecarga Progressiva,"Puxada por trás da nuca. Se fizer mais de 10 reps, usar sobrecarga (anilhas) na cintura.",Marcador de força real para largura das costas.
Setembro,Ombros,Deltoide Lateral,A,OPCIONAL Lateral Raises (Elevação Lateral),4 x 12,2-2,Até a falha,Elevar os halteres lateralmente até a altura dos ombros.,Arnold usava o método de 'descida de peso' (stripping) para chocar os deltoides.
Setembro,Bíceps,Massa Bruta / Pico,C,Rosca Direta com Barra Reta,4 x 10,2-2,I Go/You Go,"Flexão de cotovelos com barra, visualizando o pico do bíceps. Corpo como uma estátua.",Técnica 'I Go/You Go' com parceiro para maximizar intensidade.
Setembro,Pernas,Cadeia Posterior (Isquiotibiais),B,Stiff,4 x 15,2-2,Até a falha,Coluna neutra; sentir o alongamento máximo dos isquiotibiais.,Finalização de perna focada em isquiotibiais e glúteos.
Setembro,Costas,Largura (Dorsais),B,Puxada Alta (Pulley),4 x 12,2-2,Até a falha,Mãos como ganchos; puxar com os cotovelos para isolar os dorsais.,Garante o V-Taper (estética de costas largas).
Setembro,Abdominais,Transverso Abdominal,B,Stomach Vacuum (Técnica Twin),10 a 15 reps,Isometria 20-30s,Vácuo Abdominal,"Expire o ar, puxe o umbigo contra a espinha e segure.",Fortalece a parede interna para evitar dilatação visceral.
Setembro,Tríceps / Peito,Volume Bruto,C,Dips (Paralelas),4 x até a falha,2-2,Sobrecarga Progressiva,Utilizar peso extra se necessário. Foco em tríceps e peitoral inferior.,Volume bruto para finalização de braços.
Setembro,Tríceps,Cabeça Lateral,C,Tríceps Pulley Unilateral,4 x 12,2-2,Contração de Pico (Twin Style),Girar levemente o punho na base para esmagar a cabeça lateral.,Foco no detalhamento e simetria do tríceps.
Setembro,Pernas,Panturrilhas,C,Donkey / Standing Calf Raises,5 x 15-20,2-2,Pumping 24h,Subir na ponta dos pés o máximo possível. Pode-se usar alguém nas costas para o Donkey.,Treinar panturrilhas com alta prioridade para estética de campeão.
Setembro,Antebraço,Espessura do Braço,C,Rosca Inversa ou Flexão de Punho,4 x 15,2-2,Até a falha,Execução controlada para isolar a musculatura do antebraço.,Antebraços grossos são a assinatura de um homem forte.
Setembro,Pernas,Adutores,C,Cadeira Adutora,4 x 15,2-2,Até a falha,Movimento controlado focando no detalhamento interno da coxa.,Finalização de perna para detalhamento miofibrilar.
Outubro,Peitoral,Peitoral Maior,A,OPCIONAL Supino Reto (Bench Press),4 x 6-10,2-2,Movimento Parcial (Três Quartos),"Deite no banco e empurre a barra para cima. Utilize a técnica de Sergio Oliva: não suba totalmente a barra para manter a tensão constante no peito, sem descanso para o tríceps.",O foco é manter o peitoral sob tensão absoluta durante toda a série.
Outubro,Peitoral,Dureza Central,A,Supino Reto,2 x 6-10,2-0-2,Dropset na última série,"Deite em um banco plano, desça a barra até o meio do peito de forma controlada e suba explosivamente sem travar os cotovelos para manter a tensão constante.",Recrutamento massivo para dureza central.
Outubro,Braços,Bíceps,C,OPCIONAL Rosca Direta com Barra Reta,5 x 8-10,2-2,Visualização (Mind-Muscle Connection),Mantenha os cotovelos fixos ao lado do corpo. Visualize os bíceps crescendo como montanhas gigantes enquanto contrai o músculo no topo do movimento.,Foque em sentir a contração completa no topo e o alongamento total na base.
Outubro,Braços,Bíceps (Massa),C,Rosca Direta com Barra W,3 x 6-10,2-0-2,Leve 'Hitch' no final,"Em pé, segure a barra com pegada supinada. Flexione os cotovelos sem movê-los para frente. Use um leve balanço ('hitch') apenas nas repetições finais para superar a falha.",Carga massiva para dureza máxima.
Outubro,Pernas,Quadríceps (Composto),A,Leg Press,2 x 12-15,2-0-2,Falha Positiva,"Apoie os pés na plataforma, desça o peso até que as coxas toquem o tronco sem tirar a lombar do apoio. Empurre sem estender totalmente os joelhos para evitar momentum.",Exaurir o quadríceps já pré-fadigado.
Outubro,Pernas,Pernas (Geral),C,Leg Press,4 x 15-20,2-2,Pausa-Descanso,"Posicione os pés na plataforma. Desça o peso o máximo possível, trazendo os joelhos em direção aos ombros para máximo alongamento.",Mantenha o controle total da carga; evite movimentos curtos sem amplitude.
Outubro,Peitoral,Porção Clavicular,A,Supino Inclinado,3 x 6-10,2-0-4,Negativa Lenta,Deite em um banco inclinado (45-60 graus). Abaixe a barra controladamente até a porção superior do peito (perto do pescoço) para enfatizar o 'teto' do peitoral e empurre verticalmente.,Foco na espessura da porção clavicular.
Outubro,Ombros,Deltoide Posterior / Trapézio,C,OPCIONAL Remada Alta (Heavy Upright Rows),4 x 8-10,2-1-2,Roubo (Cheating),"Segure a barra com pegada pronada, mãos a 30cm de distância. Puxe a barra até logo abaixo do queixo, mantendo cotovelos altos. Use o balanço do corpo para mover cargas pesadas.","Neste movimento de potência, o roubo planejado é vital para sobrecarregar os deltoides e trapézios."
Outubro,Peitoral,Estriações Peitorais,A,OPCIONAL Crucifixo em Máquina (Machine Flys),4 x 12-15,2-1-4,Contração Isométrica,"Sente-se no aparelho e execute o movimento de fechamento. No ponto de maior contração (braços próximos), realize uma contração isométrica extra para acentuar as estriações.",Ideal para criar definição e separar as fibras musculares do peitoral.
Outubro,Costas,Latíssimo do Dorso,B,OPCIONAL Barra Fixa Frontal (Wide-Grip Chins to the Front),4 x máx.,2-1-2,Até a falha,Puxe o corpo para cima até que o topo do peito toque a barra. Mantenha os cotovelos para fora para alargar a parte superior das costas e criar o 'V-taper'.,Tocar o peito na barra oferece maior amplitude que a puxada por trás da nuca.
Outubro,Pernas,Quadríceps,C,OPCIONAL Agachamento Livre (Squats),5 x 8-12,3-1-3,Até a falha,"Barra sobre os ombros, pés na largura dos ombros. Desça até que as coxas fiquem logo abaixo da linha paralela ao chão, mantendo as costas retas.",Use um bloco sob os calcanhares para melhorar o equilíbrio e o foco nos quadríceps se necessário.
Outubro,Abdominais,Linha de Cintura,A/B/C,Vácuo Abdominal (Vacuum),4 x 30 seg.,Estática,Isometria Máxima,"Fique de joelhos ou inclinado, expire todo o ar e 'chupe' o estômago para dentro o máximo possível, tentando encostar o umbigo na espinha.",Essencial para reduzir o tamanho da linha de cintura e melhorar o controle muscular nas poses.
Outubro,Peitoral,Densidade Central e Interna,A,Pec Deck,2 x 8-12,2-2-2,Pausa de 2s no Pico,"Sente-se com as costas apoiadas. Una os braços do aparelho no centro, realize uma contração máxima com pausa de 2 segundos e retorne com uma negativa controlada sem perder a tensão.",Único exercício que permite resistência direta na contração máxima.
Outubro,Pernas,Quadríceps (Isolamento),A,Cadeira Extensora,3 x 10-15,2-1-2,Pré-Exaustão,"Sente-se e ajuste o rolo acima dos tornozelos. Estenda as pernas totalmente, contraia o quadríceps no topo e desça controladamente para isolar o músculo antes do exercício composto.",Isola o quadríceps para que seja o elo fraco no Leg Press.
Outubro,Costas,Latíssimo (Largura),B,Puxada Alta,3 x 8-12,2-0-5,Negativas Lentas,"Puxe a barra em direção à parte superior do peito, arqueando levemente as costas. No retorno, controle a descida (fase excêntrica) por 5 a 8 segundos para máximo recrutamento.",Foco na expansão do V-Taper.
Outubro,Costas,Espessura de Dorsais,B,Remada Curvada,3 x 6-10,2-1-2,Tronco Estável,"Incline o tronco à frente mantendo a coluna neutra. Puxe a barra em direção ao abdômen, mantendo os cotovelos próximos ao corpo e contraindo as escápulas no topo.",Densidade miofibrilar e espessura.
Outubro,Costas,Fibras de Alto Limiar,B,Chins (Barra Fixa),2 x Falha,2-0-8,Somente Negativas,Use um suporte para subir até o topo. Retire o suporte e controle apenas a descida de forma extremamente lenta (5 a 8 segundos) até a extensão total.,Recrutamento profundo de fibras de alto limiar.
Outubro,Pernas,Isquiotibiais,B,Mesa Flexora,3 x 10-12,2-1-2,Pico de Contração,"Deite-se no aparelho, flexione os joelhos trazendo o rolo até os glúteos. Mantenha uma contração forte no topo antes de descer controladamente.",Isolar isquiotibiais para profundidade lateral.
Outubro,Pernas,Adutores,B,Cadeira Adutora,2 x 15,2-0-2,Até a falha,"Sente-se e ajuste o aparelho. Realize o movimento de fechar as pernas com controle, focando no preenchimento do 'vazio' interno da coxa e estabilidade pélvica.",Estética de 'coxas coladas' conforme Leandro Twin.
Outubro,Braços,Tríceps (Isolamento),C,Rosca Testa,3 x 8-12,2-0-2,Cotovelos Fixos,"Deitado, segure a barra sobre o rosto. Flexione os cotovelos trazendo a barra até a testa sem mover os braços. Estenda totalmente para isolar o tríceps via resistência direta.",Carga mais desafiadora quando o antebraço está paralelo ao chão.
Outubro,Braços,Braquial e Braquiorradial,C,Rosca Martelo,2 x 10-12,2-0-3,Negativa Controlada,Segure os halteres com pegada neutra (palmas voltadas para dentro). Suba os halteres mantendo a pegada neutra e desça controlando o peso para enfatizar o braquial.,Desenvolvimento da espessura lateral do braço.
Outubro,Panturrilhas,Tríceps Sural,C,Standing Calf Raise,3 x 12-20,2-1-2,Alongamento Profundo,"Na máquina em pé, desça os calcanhares o máximo possível para alongamento total. Suba até a contração máxima (ponta dos pés) e segure por 1 segundo.",Sem amplitude completa não há hipertrofia real.
Novembro,Peitoral,Superior,A,Supino Inclinado (Barra ou Halteres),4 x 10-12 ou 6-10 reps,2-2,Pico de Contração ou Até a falha,"Deitado em banco inclinado, empurrar o peso verticalmente focando na parte superior (porção clavicular) do peito.",Foco no refinamento estético do peitoral superior; complementado pela Enciclopédia de Bodybuilding para volume.
Novembro,Peitoral,Definição e Isolamento,A,Crucifixo em Máquina (Pec Deck),4 x 12-15 ou 4 x máx.,2-4 ou 3-1-3,Contração Isométrica ou Pausa na contração máxima,"Sentado, realizar movimento de abraço com máximo alongamento e contração. Empurre até o centro, realize pausa no pico e controle a negativa.",Isolador supremo; permite contração total na posição de pico e foco no alongamento máximo na extensão.
Novembro,Peitoral,Peitoral (Composto),A,Supino com Barra,4 x máx.,2-1-3,Pré-Exaustão e Dropset,Executar após o Pec Deck sem descanso.,"No último exercício de peito, aplique um Dropset pesado para exaurir as fibras."
Novembro,Costas,Largura (Dorsal),B,OPCIONAL Barra Fixa (Pegada Larga pela Frente),4 x máx.,2-2,Roubo consciente,Puxar o corpo até tocar a parte superior do peito na barra.,Pegada o mais larga possível; permite-se um leve balanço ('cheating') quando estiver fatigado.
Novembro,Membros Inferiores,Quadríceps,A,Leg Press,4 x 12-15 ou 4 x máx.,2-2 ou 3-2,Três quartos de movimento ou Até a falha,"Pés na largura dos ombros. Trazer os joelhos o mais próximo possível dos ombros, descendo até quase tocar o peito.","Para focar na parte inferior da coxa (Vasto Medial), subir apenas 3/4 do caminho. Evitar hiperextensão lombar."
Novembro,Ombros,Deltoide Posterior,B,OPCIONAL Remada Alta Pesada (Heavy Upright Rows),4 x 8-10,2-1,Roubo (Cheating),"Puxar a barra até o queixo com cotovelos altos, usando ajuda das pernas e costas.",Movimento de potência; o roubo consciente é vital para esta variação específica de recrutamento posterior.
Novembro,Braços,Bíceps,B,OPCIONAL Rosca Direta com Barra Reta,4 x 10,2-2,Visualização e Pico de Contração,"Flexão de cotovelos com barra, visualizando o bíceps como uma montanha.",Usar o método 'I Go/You Go' com parceiro para aumentar a intensidade.
Novembro,Braços,Bíceps (Pico),B,Rosca Preacher (Preacher Curl),4 x máx.,Negativas de 7-10s,Falha Estática e Negativas,"Segure no topo até esgotar a força estática, então inicie a descida negativa controlada.",As negativas recrutam fibras latentes em treinos convencionais.
Novembro,Braços,Tríceps (Parte Inferior),C,Tríceps no Pulley (Cabo),4 x 12-15,2-2,Repetições Parciais,Trabalhar apenas o terço inferior do arco de movimento para focar na parte baixa do músculo.,Manter os cotovelos fixos ao lado do corpo.
Novembro,Dorsais,Costas (Amplitude),B,Puxada Alta (Pulldown),4 x máx.,2-2,Rest-Pause,Foco na amplitude total do movimento.,Busca pelo clássico 'V-Taper'.
Novembro,Dorsais,Costas (Espessura),B,Remada Curvada,4 x máx.,2-1-2,Até a falha,Foco na espessura das dorsais.,Fundamental para a densidade das costas.
Novembro,Antebraço,Flexores do Punho,B,Flexão de punho,4 x máx.,2-2,Até a falha,Movimentos controlados para garantir densidade uniforme.,Essencial para a simetria dos braços.
Novembro,Pernas,Posterior de Coxa,B,Stiff ou Leg Curl,4 x máx.,3-1-2,Alongamento Mandatório,Alongamento total no fundo seguido de contração explosiva.,O alongamento correto protege a integridade da coluna.
Novembro,Membros Inferiores,Quadríceps,C,OPCIONAL Agachamento (Squat),5 x 8-12,2-2,Até a falha,Descer até que as coxas fiquem abaixo do paralelo ao chão.,Pode ser feito com um calço baixo sob os calcanhares para melhor equilíbrio.
Novembro,Tríceps,Cabeça Longa / Inferior,C,Dips (Paralelas),4 x máx.,2-2,Até a falha,Incline o corpo para frente para recrutar peitoral inferior e deltoide anterior.,Exercício essencial para o 'terceiro ângulo' do peito e detalhamento do tríceps.
Novembro,Tríceps,Detalhamento,C,Extensões de Tríceps,4 x máx.,Lenta (4-4),Negativas,Movimento lento com foco na 'Dura Cabeça' do músculo.,Foco no detalhamento estético da cabeça longa.
Novembro,Ombros,Deltoide Lateral,C,Elevação Lateral,4 x máx.,2-1-2,Até a falha,Foco no arredondamento lateral dos ombros.,Crucial para a largura dos ombros.
Novembro,Panturrilhas,Gastrocnêmio,C,Elevação de Gêmeos em Pé / Toe Presses,5 x 15-20 ou 4 x máx.,2-2 ou 2s pausa,Contração Máxima ou Pausa de Pico,"Subir na ponta dos pés o máximo possível. No Leg Press: joelhos travados, alongamento total e explosão.",Praticar a flexão constante entre as séries. A pausa de dois segundos no topo isola efetivamente o gastrocnêmio.
Dezembro,Peito,Superior,A,Supino Inclinado com Halteres,4 x 8-12,2-2,Até a falha / Rest-Pause,"Deitado em banco inclinado, empurrar os halteres para cima unindo-os no topo sem bater",Focar na contração da parte superior do peitoral conforme Arnold 1. Técnica de Rest-Pause na última série: 15s de descanso e + 2-3 reps 2.
Dezembro,Peito,Médio/Geral,A,Supino Reto (Barra),4 x 6-10,3-1-3,Movimentos parciais (3/4) / Rest-Pause,Descer a barra até o peito e subir apenas 3/4 do caminho para manter tensão constante,Técnica de Sergio Oliva para evitar descanso no topo 1. Rest-Pause na última série: 15s de descanso e + 2-3 reps 2.
Dezembro,Peito,Isolamento/Definição,A,Crucifixo (Máquina ou Halteres),4 x 10-15,2-0-2,Contrações isométricas,"Amplitude total, alongando ao máximo e contraindo fortemente no centro por 2 segundos",Focar em estriações e separação muscular 1. Exercício padrão-ouro para expansão 2.
Dezembro,Costas,Latíssimo (Largura),B,Barra Fixa ou Puxada Alta,4 x máx.,2-0-2,Até a falha,Puxar o corpo até tocar a parte superior do peito na barra / Padrão-ouro,Permitido leve 'roubo' para completar repetições extras 1. Foco em largura e densidade 2.
Dezembro,Costas,Espessura,B,Remada Curvada (Barra),4 x 8-12,2-2,Até a falha,"Tronco inclinado ou paralelo ao chão, puxar a barra em direção ao abdômen inferior",Estilo McCallum: arquear no pico e permitir alongamento total (dead hang) na descida 2.
Dezembro,Pernas,Quadríceps,A,Agachamento Livre (Barra),5 x 10-15,3-1-3,Até a falha,"Agachar até abaixo da linha paralela, pés sobre um bloco baixo se necessário",Inspirado na intensidade de Tom Platz; foco total na dor e esforço 1. Integração em 100% das sessões 2.
Dezembro,Pernas,Panturrilhas,B,Elevação de Gêmeos (Pé),5 x 15-20,2-2-2,Prioridade Muscular,"Amplitude máxima, pausa clara no alongamento máximo e apertando no topo",Praticar poses de panturrilha entre as séries para controle 1. Foco em contração máxima 2.
Dezembro,Abdômen,Linha de Cintura,C,Stomach Vacuum (Vácuo),4 x 30 seg.,Ciclo 3-3-3,Isometria,"Expulsar o ar e sugar o abdômen para dentro; ciclo de inspirar, tensionar e expirar",Reduz visivelmente a cintura. Essencial para controle no bulking 2.
Dezembro,Ombros,Deltoide Médio,B,Elevação Lateral com Halteres,4 x 10-12,2-0-2,Séries descendentes (Stripping),Elevar os halteres lateralmente até a altura dos ombros,Reduzir o peso imediatamente após falha e continuar sem descanso
Dezembro,Ombros,Geral/Trapézio,B,OPCIONAL Remada Alta Pesada (Heavy Upright Row),4 x 6-8,2-2,Cheating (Roubo),Puxar a barra até o queixo usando impulso das pernas e costas,Movimento de potência para massa e espessura
Dezembro,Braços,Bíceps,C,OPCIONAL Rosca Direta com Barra Reta,4 x 8-10,3-0-3,I Go / You Go,"Execução estrita, trocando a barra com o parceiro sem descanso entre as séries",Visualizar bíceps como montanhas gigantes
Dezembro,Braços,Tríceps,C,OPCIONAL Extensão de Tríceps no Pulley,4 x 12-15,2-0-2,Repetições Parciais,Trabalhar apenas o terço inferior do movimento para focar na cabeça longa,Utilizar contração isométrica no final por 3 segundos
Dezembro,Pernas,Posterior de Coxa,B,Stiff,4 x máx.,2-2,Até a falha,Mantendo as costas arqueadas e pernas semicerradas,Foco no alongamento do posterior
Dezembro,Braços,Bíceps e Tríceps,C,Super-série: Rosca Direta com Mergulho,4 x máx.,Descida controlada,Super-série e Dropset,Sem descanso entre os exercícios; priorizar fase excêntrica,Objetivo: Maturidade bruta nos braços
Dezembro,Pescoço,Estabilidade,C,Flexão e Extensão de Pescoço,4 x máx.,2-2,Até a falha,Com anilha e proteção (almofada),Utilizar alongamento técnico Twin pós-treino
Dezembro,Antebraço,Braquiorradial e Flexores,C,Rosca Inversa,4 x máx.,2-2,Até a falha,Focando no braquiorradial e flexores do carpo,Libera a fáscia e previne epicondilites
Dezembro,Pernas,Sistêmico,C,Breathing Squats,1 x 25 reps,Lenta (pausas),Respiração Progressiva,1-10 reps (3 resp.); 11-20 reps (6 resp.); 21-25 reps (10 resp.) entre reps,Objetivo: Expandir gradil costal e metabolismo
Janeiro,Peito,Peitoral Superior,A,OPCIONAL Supino Inclinado (Barra ou Halteres),4 x 8-12,2-0-2,Repetições Negativas Forçadas,Executar em um banco inclinado para focar na parte superior dos peitorais.,Trabalha a parte superior para preencher a moldura do tórax.
Janeiro,Peito,Peitoral Superior,A,Neck Press (Gironda Style),4-5 x 8-12,Lenta na exêntrica,Pico de contração (1 seg),Barra toca a base do pescoço; cotovelos abertos em 90 graus.,Sugestão: 50% da carga máxima; foco total na forma.
Janeiro,Peito,Peitoral Médio / Superior,A,Crucifixo Inclinado,4 x 10,2-2,Alongamento máximo,Executar o movimento garantindo a expansão da caixa torácica.,Progressão controlada de carga.
Janeiro,Peito,Peitoral Médio,A,Supino Reto (Barra),4 x 8-12,Fase excêntrica lenta,Até a falha / Dropset,Movimento completo; foco no recrutamento neuromuscular e contração máxima.,"O foco não é apenas carga, mas a qualidade da contração."
Janeiro,Peito,Definição Peitoral,A,OPCIONAL Crucifixo em Máquina (Machine Flys),4 x 10-15,2-2-2,Contração Isométrica,Máximo alongamento e contração isométrica ao fechar os braços.,Útil para criar estriações e detalhes musculares.
Janeiro,Ombros,Deltoides (Frontal e Lateral),A,Arnold Press,4 x 8-12,2-1-2,Séries descendentes (Drop-sets),Iniciar com halteres voltados para o corpo e rotacionar na subida.,Proporciona desenvolvimento completo das cabeças do deltoide.
Janeiro,Ombros,Deltoide e Trapézio,A,OPCIONAL Remada Alta Pesada (Heavy Upright Rows),4 x 6-10,2-0-2,Cheating (Roubo consciente),Puxar a barra até o queixo usando um leve impulso das pernas.,Movimento de potência para largura de ombros e trapézio.
Janeiro,Pernas,Quadríceps,A,Knees-together Hack Slide,4 x máx.,Controlada,Bounces (Pulos curtos),Pés e joelhos próximos; descer ao máximo com dois bounces no fundo.,Foco no vasto lateral e curvatura externa da coxa.
Janeiro,Costas,Latíssimo do Dorso,B,OPCIONAL Barra Fixa (Wide-Grip Chins),5 x Máx.,2-1-2,Até a falha,Puxar até o peito tocar a barra para maior amplitude.,Essencial para alargar a parte superior das costas.
Janeiro,Costas,Dorsal Profundo,B,Medium-grip Chin,4 x 8,Fase excêntrica lenta,Esterno toca a barra,"Puxar o corpo jogando a cabeça para trás em posição de ""planche"".",Peso do corpo com foco técnico avançado.
Janeiro,Costas,Espessura das Costas,B,Remada Curvada (Barbell Rows),4 x 8-12,Lenta e deliberada,Supersérie / Pico de contração,Tronco inclinado/paralelo; tração iniciada pelos cotovelos; arquear as costas.,Arnold sugere superset peito/costas; foco em espessura geral.
Janeiro,Bíceps,Pico do Bíceps,B,Rosca Direta com Barra Reta,4 x 8-12,2-1-2,I Go / You Go / Burns,Executar com foco na contração total; 3-4 parciais ao final.,Visualizar bíceps como montanhas; carga progressiva.
Janeiro,Pernas,Posterior de Coxa,B,Thigh Curl (Mesa Flexora),4 x 12,Lenta na descida,Dedos dos pés para fora,O rolo deve tocar os glúteos em cada repetição.,Recrutamento das cabeças laterais do bíceps femoral.
Janeiro,Pernas,Quadríceps,C,OPCIONAL Agachamento (Squat),5 x 8-12,2-1-2,Método de Stripping,Agachar abaixo da paralela; calcanhares elevados se necessário.,A base para pernas massivas. Referência: Tom Platz.
Janeiro,Pernas,Quadríceps e Glúteos,B,OPCIONAL Leg Press,4 x 10-15,2-1-2,Repetições Parciais,Trazer os joelhos o mais próximo possível dos ombros.,Pode ser feito em máquinas angulares ou horizontais.
Janeiro,Pernas,Panturrilhas,C,OPCIONAL Elevação de Gêmeos em Pé,5 x 15-20,2-2-2,Princípio da Prioridade,Subir o máximo possível nas pontas dos pés.,Prioridade de Arnold para transformar fraqueza em força.
Janeiro,Pernas,Panturrilhas,C,Reeves Toe Press (Leg Press),1 x 20+,Rápida com Pico,Foco no dedão,Calcanhares para dentro; executar até a falha neuromuscular.,Executar até a falha absoluta.
Janeiro,Tríceps,Cabeça Lateral,C,Tríceps Pulley,4 x 12,Excêntrica controlada,Cotovelos imóveis,Focar na contração máxima e tempo sob tensão.,Carga moderada.
Janeiro,Tríceps,Cabeça Longa,C,Tríceps Testa,4 x 10,Lenta e deliberada,Alongamento profundo,Manter a integridade biomecânica para isolar o tríceps.,Carga progressiva.
Janeiro,Pescoço,Densidade Cervical,C,Flexão/Extensão de Pescoço,3 x 15-20,2-2,Até a falha,Uso de anilha na testa ou nuca com proteção.,A dor tardia pode assemelhar-se a dor de garganta.
Janeiro,Abdômen,Linha de Cintura,A/B/C,Vacuum (Vácuo Abdominal),4 x 30 seg.,Estática,Isometria Máxima,Exalar todo o ar e encolher o abdômen ao máximo.,Reduz a cintura e melhora o controle muscular.`;

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1_2aqsSQMa8PdCsNQcTkdBj1hepqruyeaobwVD4OXZL0/export?format=csv";

// --- Utilitários ---

const parseCSV = (text) => {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    let currentLine = lines[i];
    
    const matches = currentLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    let values = [];
    if (currentLine.includes('"')) {
        let inQuote = false;
        let buffer = '';
        for(let char of currentLine) {
            if(char === '"') { inQuote = !inQuote; continue; }
            if(char === ',' && !inQuote) { values.push(buffer); buffer = ''; }
            else { buffer += char; }
        }
        values.push(buffer);
    } else {
        values = currentLine.split(',');
    }

    headers.forEach((header, index) => {
      let val = values[index] ? values[index].trim() : '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      obj[header] = val;
    });
    
    if (obj['Exercício']) {
        result.push(obj);
    }
  }
  return result;
};

// Pega o nome do mês atual em Português
const getCurrentMonthName = () => {
    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return monthNames[new Date().getMonth()];
};

// Componente de Card de Exercício
const ExerciseCard = ({ data, onSaveLog, history, isCompleted }) => {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Lógica de Opcional
  const rawExerciseName = data['Exercício'] || "";
  const isOptional = rawExerciseName.trim().toUpperCase().startsWith("OPCIONAL");
  
  const displayTitle = isOptional 
    ? rawExerciseName.replace(/^OPCIONAL\s*/i, '') 
    : rawExerciseName;

  const handleSave = () => {
    if (!weight) return;
    onSaveLog(rawExerciseName, weight, reps);
    setWeight('');
    setReps('');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const lastLog = history && history.length > 0 ? history[0] : null;

  // --- MODO COMPACTO (EXERCÍCIO CONCLUÍDO) ---
  if (isCompleted) {
    return (
        <div className="bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-800 rounded-xl p-3 mb-2 flex items-center justify-between shadow-sm opacity-80 animate-in slide-in-from-right-2">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-emerald-200 dark:bg-emerald-800 p-1.5 rounded-full flex-shrink-0">
                    <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-100" />
                </div>
                <div className="min-w-0">
                    <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider truncate">
                        {data['Grupo muscular']}
                    </div>
                    <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100 truncate">
                        {displayTitle}
                    </h3>
                </div>
            </div>
            {lastLog && (
                <div className="text-right flex-shrink-0 pl-2">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-200/50 dark:bg-emerald-800 px-2 py-1 rounded-md">
                        {lastLog.weight}kg • {lastLog.reps || data['Séries/Reps'].split('x')[0]} reps
                    </span>
                </div>
            )}
        </div>
    );
  }

  // --- MODO EXPANDIDO (NORMAL) ---

  const cardStyles = isOptional
    ? "bg-purple-50/80 dark:bg-purple-900/10 border-purple-300 dark:border-purple-800 border-dashed"
    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm";

  const headerStyles = isOptional
    ? "bg-purple-100/50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800"
    : "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700";

  return (
    <div className={`rounded-xl border overflow-hidden mb-4 transition-all hover:shadow-md ${cardStyles}`}>
      
      {/* Cabeçalho */}
      <div className={`p-4 border-b flex justify-between items-start ${headerStyles}`}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              {data['Grupo muscular']}
            </span>
            {isOptional && (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full uppercase tracking-wide">
                <Sparkles className="w-3 h-3" />
                Opcional
              </span>
            )}
          </div>
          <h3 className={`text-lg font-bold leading-tight ${isOptional ? 'text-slate-700 dark:text-slate-300' : 'text-slate-800 dark:text-slate-100'}`}>
            {displayTitle}
          </h3>
          <span className="text-xs text-slate-500">{data['Especificação do grupo muscular']}</span>
        </div>
        {lastLog && (
          <div className="text-right hidden sm:block ml-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">Última</div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400">{lastLog.weight}kg</div>
          </div>
        )}
      </div>

      {/* Detalhes */}
      <div className="p-4 grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-start gap-2">
          <TrendingUp className={`w-4 h-4 mt-0.5 ${isOptional ? 'text-purple-400' : 'text-slate-400'}`} />
          <div>
            <span className="block text-slate-500 dark:text-slate-400 text-xs">Séries / Reps</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{data['Séries/Reps']}</span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock className={`w-4 h-4 mt-0.5 ${isOptional ? 'text-purple-400' : 'text-slate-400'}`} />
          <div>
            <span className="block text-slate-500 dark:text-slate-400 text-xs">Cadência</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{data['Cadência']}</span>
          </div>
        </div>
        {data['Técnica Avançada'] && (
          <div className="col-span-2 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30">
            <Zap className="w-4 h-4 text-amber-500 mt-0.5" />
            <div>
              <span className="block text-amber-600 dark:text-amber-400 text-xs font-bold">Técnica Avançada</span>
              <span className="text-amber-800 dark:text-amber-200">{data['Técnica Avançada']}</span>
            </div>
          </div>
        )}
      </div>

      {/* Execução */}
      <div className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-300 space-y-2">
        <p><span className="font-semibold text-slate-700 dark:text-slate-200">Execução:</span> {data['Modo de execução']}</p>
        {data['Observação'] && (
            <p className="text-xs italic text-slate-500"><span className="font-semibold">Nota:</span> {data['Observação']}</p>
        )}
      </div>

      {/* Registro */}
      <div className={`p-4 border-t ${isOptional ? 'bg-purple-50/50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
        <div className="flex items-end gap-3">
            <div className="flex-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Carga (kg)</label>
                <input 
                    type="number" 
                    inputMode="decimal"
                    placeholder="ex: 20"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            <div className="w-20">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Reps</label>
                <input 
                    type="number" 
                    inputMode="numeric"
                    placeholder={data['Séries/Reps'].split('x')[1] || "12"}
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            <button 
                onClick={handleSave}
                disabled={!weight}
                className={`p-2.5 rounded-lg flex items-center justify-center transition-all ${
                    savedSuccess 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
            >
                {savedSuccess ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            </button>
            <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2.5 rounded-lg border transition-all ${
                    showHistory 
                    ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-slate-700 dark:border-slate-600 dark:text-blue-300' 
                    : 'border-slate-300 text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
            >
                <History className="w-5 h-5" />
            </button>
        </div>

        {showHistory && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Histórico Recente</h4>
                {history && history.length > 0 ? (
                    <div className="space-y-2">
                        {history.map((log, idx) => (
                            <div key={idx} className="flex justify-between text-sm p-2 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                                <span className="text-slate-500 text-xs">{new Date(log.date).toLocaleDateString('pt-BR')}</span>
                                <div className="flex gap-4">
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{log.weight}kg</span>
                                    {log.reps && <span className="text-slate-500 text-xs mt-0.5">{log.reps} reps</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 italic">Nenhum registro ainda.</p>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthName());
  const [selectedWorkout, setSelectedWorkout] = useState('A');
  
  // Histórico Geral (Persistência Longa)
  const [workoutLogs, setWorkoutLogs] = useState(() => {
    const saved = localStorage.getItem('gym_tracker_logs');
    return saved ? JSON.parse(saved) : {};
  });

  // Estado da Sessão Atual (Exercícios marcados como feitos hoje)
  const [completedExercises, setCompletedExercises] = useState(() => {
    const saved = localStorage.getItem('gym_tracker_session_completed');
    return saved ? JSON.parse(saved) : [];
  });

  // EFEITO DE FUNDO
  useEffect(() => {
    document.body.style.backgroundColor = '#020617';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetch(SHEET_CSV_URL);
        if (!response.ok) throw new Error('Falha na rede');
        const text = await response.text();
        const parsed = parseCSV(text);
        if(parsed.length > 0) setRawData(parsed);
        else throw new Error('CSV Vazio');
      } catch (err) {
        console.log("Usando dados de backup offline devido a:", err);
        const parsed = parseCSV(INITIAL_CSV_DATA);
        setRawData(parsed);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Persistência
  useEffect(() => {
    localStorage.setItem('gym_tracker_logs', JSON.stringify(workoutLogs));
  }, [workoutLogs]);

  useEffect(() => {
    localStorage.setItem('gym_tracker_session_completed', JSON.stringify(completedExercises));
  }, [completedExercises]);

  const availableMonths = useMemo(() => {
    const months = new Set(rawData.map(d => d['Mês']));
    return Array.from(months);
  }, [rawData]);

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
        setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // --- LÓGICA DE FILTRO E ORDENAÇÃO ---
  const filteredExercises = useMemo(() => {
    const filtered = rawData.filter(item => {
        const itemMonth = item['Mês']?.trim();
        const itemWorkout = item['Treino']?.trim();
        
        const isMonthMatch = itemMonth === selectedMonth;
        const isWorkoutMatch = itemWorkout && (itemWorkout === selectedWorkout || itemWorkout.includes(selectedWorkout));

        return isMonthMatch && isWorkoutMatch;
    });

    return filtered.sort((a, b) => {
        const nameA = a['Exercício'] || '';
        const nameB = b['Exercício'] || '';

        // Critério 0: Concluídos vão para o final
        const isCompletedA = completedExercises.includes(nameA);
        const isCompletedB = completedExercises.includes(nameB);

        if (isCompletedA !== isCompletedB) {
            return isCompletedA ? 1 : -1; // Se A está completo, ele vai para baixo (1)
        }

        // Critério 1: Grupo Muscular (A-Z)
        const groupA = (a['Grupo muscular'] || '').trim();
        const groupB = (b['Grupo muscular'] || '').trim();
        const compareGroup = groupA.localeCompare(groupB, 'pt-BR');
        
        if (compareGroup !== 0) return compareGroup;

        // Critério 2: Nome do Exercício (A-Z)
        const cleanNameA = nameA.replace(/^OPCIONAL\s*/i, '').trim();
        const cleanNameB = nameB.replace(/^OPCIONAL\s*/i, '').trim();
        
        return cleanNameA.localeCompare(cleanNameB, 'pt-BR');
    });

  }, [rawData, selectedMonth, selectedWorkout, completedExercises]);

  const handleSaveLog = (exerciseName, weight, reps) => {
    const newLog = {
        date: new Date().toISOString(),
        weight: weight,
        reps: reps
    };
    
    // 1. Salva no histórico
    setWorkoutLogs(prev => {
        const currentLogs = prev[exerciseName] || [];
        return { ...prev, [exerciseName]: [newLog, ...currentLogs] };
    });

    // 2. Marca como concluído na sessão (Para encolher o card)
    setCompletedExercises(prev => {
        if (!prev.includes(exerciseName)) {
            return [...prev, exerciseName];
        }
        return prev;
    });
  };

  const handleResetSession = () => {
    if(window.confirm("Deseja iniciar uma nova sessão? Isso restaurará todos os exercícios.")) {
        setCompletedExercises([]);
    }
  };

  const getExerciseHistory = (exerciseName) => {
    return workoutLogs[exerciseName] || [];
  };

  const syncData = async () => {
      setLoading(true);
      try {
        const response = await fetch(SHEET_CSV_URL);
        if(!response.ok) throw new Error("Erro de conexão");
        const text = await response.text();
        const parsed = parseCSV(text);
        setRawData(parsed);
        alert("Dados sincronizados!");
      } catch (e) {
        alert("Não foi possível sincronizar automaticamente. Usando dados locais.");
      } finally {
        setLoading(false);
      }
  };

  const currentDocLink = MONTHLY_DOCS[selectedMonth];

  if (loading && rawData.length === 0) {
    return (
        <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
            <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-slate-500">Carregando plano de treino...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-20 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Top Bar */}
      <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-2 rounded-lg">
                    <Dumbbell className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-lg leading-none">IronTracker</h1>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Hipertrofia Anual</p>
                </div>
            </div>
            
            <div className="flex gap-2">
                {/* Botão Resetar Sessão */}
                <button 
                    onClick={handleResetSession}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors" 
                    title="Nova Sessão (Resetar Cards)"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
                <button onClick={syncData} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Sincronizar Planilha">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Month Selector & Doc Link */}
        <div className="max-w-md mx-auto px-4 py-2 border-t border-slate-100 dark:border-slate-800">
            <div className="relative mb-2">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                >
                    {availableMonths.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {currentDocLink && (
              <a
                href={currentDocLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full p-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Ler Guia de {selectedMonth}
              </a>
            )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 pt-4">
        
        {/* Workout Tabs */}
        <div className="flex p-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
            {['A', 'B', 'C'].map((workout) => (
                <button
                    key={workout}
                    onClick={() => setSelectedWorkout(workout)}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                        selectedWorkout === workout
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    Treino {workout}
                </button>
            ))}
        </div>

        {/* Exercise List */}
        <div className="space-y-4">
            {filteredExercises.length > 0 ? (
                filteredExercises.map((exercise, idx) => (
                    <ExerciseCard 
                        key={`${exercise['Exercício']}-${idx}`} 
                        data={exercise} 
                        onSaveLog={handleSaveLog}
                        history={getExerciseHistory(exercise['Exercício'])}
                        isCompleted={completedExercises.includes(exercise['Exercício'])}
                    />
                ))
            ) : (
                <div className="text-center py-12">
                    <div className="bg-slate-200 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Info className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-slate-600 dark:text-slate-300 font-medium">Nenhum treino encontrado</h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Não há registros para o Treino {selectedWorkout} em {selectedMonth}.
                    </p>
                </div>
            )}
        </div>

        <div className="mt-8 text-center pb-8">
            <p className="text-xs text-slate-400 mb-2">
                Progresso salvo automaticamente neste dispositivo.
            </p>
        </div>
      </main>
    </div>
  );
}