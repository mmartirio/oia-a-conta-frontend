import { DocumentoLegal } from '../../components/DocumentoLegal'
import { CONTATO_SUPORTE, DATA_VIGENCIA_DOCUMENTOS, DOMINIO_PLATAFORMA, VERSAO_CONTRATO } from '../../constants/legal'

// Texto do Contrato de Adesão fornecido pelo dono do produto (elaborado com
// apoio de IA, sem revisão advocatícia até o momento) — mantido verbatim,
// só preenchendo os placeholders ([DATA]/[VERSÃO]/[DOMÍNIO]/[E-MAIL]) com as
// constantes compartilhadas em constants/legal.ts.
export function ContratoAdesao() {
  return (
    <DocumentoLegal titulo="Contrato de Adesão aos Serviços da Plataforma Oia a Conta">
      <p><em>Última atualização: {DATA_VIGENCIA_DOCUMENTOS}</em></p>

      <p>
        Pelo presente instrumento, de um lado, a empresa responsável pela plataforma <strong>Oia a Conta</strong>,
        doravante denominada <strong>CONTRATADA</strong>, e, de outro, a pessoa física ou jurídica que realizar o
        cadastro e contratar qualquer plano disponibilizado na plataforma, doravante denominada{' '}
        <strong>CONTRATANTE</strong>, têm entre si estabelecidas as seguintes condições de contratação.
      </p>
      <p>
        Ao criar uma conta, selecionar um plano e concluir a contratação, o CONTRATANTE declara que leu,
        compreendeu e concorda com este Contrato de Adesão e com as demais condições aplicáveis ao uso da
        plataforma, incluindo os Termos de Uso e a Política de Privacidade.
      </p>

      <h2>1. Objeto</h2>
      <p>
        1.1. O presente contrato tem por objeto a prestação de serviços de software como serviço
        (<strong>SaaS – Software as a Service</strong>) por meio da plataforma <strong>Oia a Conta</strong>,
        destinada à gestão de estabelecimentos do segmento de alimentação e delivery.
      </p>
      <p>1.2. De acordo com o plano contratado, a plataforma poderá disponibilizar funcionalidades como:</p>
      <ul>
        <li>gestão de mesas;</li>
        <li>comandas e pedidos;</li>
        <li>atendimento e organização da cozinha;</li>
        <li>controle de caixa;</li>
        <li>gestão de produtos;</li>
        <li>gestão de clientes;</li>
        <li>delivery;</li>
        <li>impressão e/ou emissão de informações relacionadas aos pedidos;</li>
        <li>relatórios e indicadores;</li>
        <li>integrações com serviços de terceiros;</li>
        <li>outras funcionalidades disponibilizadas pela plataforma.</li>
      </ul>
      <p>
        1.3. As funcionalidades disponíveis poderão variar de acordo com o plano contratado e poderão ser
        atualizadas, aprimoradas ou modificadas pela CONTRATADA, sem prejuízo das condições comerciais
        contratadas.
      </p>

      <h2>2. Contratação e Aceite</h2>
      <p>
        2.1. A contratação será considerada concluída quando o CONTRATANTE realizar o cadastro, selecionar o
        plano desejado e manifestar sua concordância com este contrato.
      </p>
      <p>
        2.2. O aceite eletrônico realizado por meio da plataforma terá validade para fins de comprovação da
        contratação, sem prejuízo dos direitos assegurados pela legislação aplicável.
      </p>
      <p>2.3. O CONTRATANTE é responsável pela veracidade e atualização das informações fornecidas no cadastro.</p>

      <h2>3. Plano e Valor</h2>
      <p>
        3.1. O plano inicialmente contratado será o <strong>Start UP</strong>, pelo valor de{' '}
        <strong>R$ 59,90 (cinquenta e nove reais e noventa centavos) por mês</strong>.
      </p>
      <p>
        3.2. O presente contrato aplica-se também aos demais planos disponibilizados pela plataforma,
        prevalecendo, em cada caso, o plano, preço e condições apresentados ao CONTRATANTE no momento da
        contratação ou alteração do plano.
      </p>
      <p>
        3.3. Os valores dos planos poderão ser alterados para futuras contratações ou renovações, mediante
        comunicação prévia ao CONTRATANTE, respeitada a legislação aplicável.
      </p>

      <h2>4. Forma e Condições de Pagamento</h2>
      <p>
        4.1. A cobrança será realizada mensalmente, por meio de <strong>PIX</strong>, conforme as condições
        apresentadas no momento da contratação.
      </p>
      <p>
        4.2. O vencimento ocorrerá mensalmente na data correspondente ao dia da ativação do plano, salvo
        condição diferente expressamente apresentada pela plataforma.
      </p>
      <p>4.3. A ausência de pagamento até a data de vencimento caracterizará inadimplência.</p>
      <p>
        4.4. Em caso de inadimplência, a CONTRATADA poderá restringir ou suspender o acesso à plataforma após{' '}
        <strong>3 (três) dias úteis</strong> do vencimento, sem prejuízo da possibilidade de regularização do
        débito.
      </p>
      <p>
        4.5. Após a regularização do pagamento, o acesso poderá ser restabelecido conforme os procedimentos
        técnicos da plataforma.
      </p>

      <h2>5. Cancelamento</h2>
      <p>5.1. A contratação não possui prazo mínimo de permanência ou período de fidelidade.</p>
      <p>5.2. O CONTRATANTE poderá solicitar o cancelamento a qualquer momento, sem cobrança de multa ou taxa de cancelamento.</p>
      <p>
        5.3. O cancelamento poderá ser solicitado por meio do próprio painel da plataforma ou pelos canais
        oficiais de atendimento disponibilizados pela CONTRATADA.
      </p>
      <p>
        5.4. Caso o cancelamento seja solicitado após o pagamento do período de utilização já iniciado, o
        acesso permanecerá disponível até o término do período correspondente, não sendo realizada nova
        cobrança após o cancelamento.
      </p>
      <p>5.5. O disposto na cláusula anterior não prejudica o exercício do direito de arrependimento previsto na legislação aplicável.</p>

      <h2>6. Direito de Arrependimento</h2>
      <p>
        6.1. Nas hipóteses em que a contratação estiver sujeita ao direito de arrependimento previsto no{' '}
        <strong>art. 49 do Código de Defesa do Consumidor</strong>, o CONTRATANTE poderá desistir da
        contratação no prazo legal de <strong>7 (sete) dias</strong>, contado na forma prevista na legislação.
      </p>
      <p>
        6.2. Exercido validamente o direito de arrependimento dentro do prazo legal, os valores eventualmente
        pagos durante esse período serão integralmente restituídos ao CONTRATANTE.
      </p>
      <p>6.3. O direito de arrependimento não se confunde com o cancelamento ordinário previsto neste contrato.</p>

      <h2>7. Alteração ou Migração de Plano</h2>
      <p>
        7.1. O CONTRATANTE poderá solicitar a migração para outro plano disponibilizado pela plataforma,
        observadas as condições comerciais vigentes no momento da alteração.
      </p>
      <p>
        7.2. Eventuais diferenças de valores decorrentes da alteração de plano poderão ser calculadas
        proporcionalmente ao período de utilização, conforme as regras apresentadas pela plataforma no
        momento da migração.
      </p>
      <p>7.3. As funcionalidades e limites aplicáveis ao novo plano passarão a vigorar conforme a efetivação da alteração.</p>

      <h2>8. Disponibilidade e Manutenção da Plataforma</h2>
      <p>8.1. A CONTRATADA envidará esforços razoáveis para manter a plataforma disponível e em funcionamento de forma adequada.</p>
      <p>8.2. Poderão ocorrer indisponibilidades temporárias decorrentes de:</p>
      <ul>
        <li>manutenção programada;</li>
        <li>atualizações;</li>
        <li>falhas de infraestrutura;</li>
        <li>falhas de serviços de terceiros;</li>
        <li>problemas de conexão com a internet;</li>
        <li>indisponibilidade de provedores de hospedagem, APIs ou integrações;</li>
        <li>eventos de força maior ou caso fortuito;</li>
        <li>outras situações alheias ao controle razoável da CONTRATADA.</li>
      </ul>
      <p>8.3. Sempre que possível, manutenções programadas que possam afetar significativamente a utilização da plataforma serão comunicadas previamente.</p>

      <h2>9. Responsabilidades do Contratante</h2>
      <p>9.1. O CONTRATANTE é responsável por manter corretos e atualizados seus dados cadastrais.</p>
      <p>
        9.2. O CONTRATANTE é responsável pela utilização adequada da plataforma, bem como pelos dados,
        produtos, preços, informações de clientes, pedidos e demais conteúdos inseridos em sua conta.
      </p>
      <p>
        9.3. O CONTRATANTE deverá manter em sigilo suas credenciais de acesso, sendo responsável por impedir o
        uso indevido de seu login, senha ou demais mecanismos de autenticação.
      </p>
      <p>
        9.4. O CONTRATANTE não poderá utilizar a plataforma para atividades ilícitas, fraudulentas ou que
        violem direitos de terceiros ou a legislação vigente. Condutas proibidas adicionais e detalhamento
        dessas responsabilidades constam nos Termos de Uso.
      </p>

      <h2>10. Dados e Responsabilidade pelas Informações Inseridas</h2>
      <p>
        10.1. Os dados inseridos pelo CONTRATANTE na plataforma permanecerão sob sua responsabilidade quanto
        à origem, legitimidade, exatidão e finalidade de utilização.
      </p>
      <p>
        10.2. Quando o CONTRATANTE inserir dados pessoais de seus clientes, funcionários ou terceiros na
        plataforma, deverá observar a legislação aplicável à proteção de dados pessoais e possuir base legal
        adequada para o respectivo tratamento.
      </p>
      <p>
        10.3. A CONTRATADA poderá tratar os dados necessários à execução dos serviços contratados, segurança
        da plataforma, atendimento ao CONTRATANTE, cumprimento de obrigações legais e demais finalidades
        legítimas relacionadas à prestação do serviço, conforme detalhado na Política de Privacidade.
      </p>

      <h2>11. Proteção de Dados Pessoais – LGPD</h2>
      <p>
        11.1. O tratamento de dados pessoais realizado pela CONTRATADA observará a{' '}
        <strong>Lei nº 13.709/2018 – Lei Geral de Proteção de Dados Pessoais (LGPD)</strong> e demais normas
        aplicáveis.
      </p>
      <p>
        11.2. Para os dados pessoais necessários à prestação dos serviços contratados, a CONTRATADA poderá
        utilizar, conforme a finalidade e o contexto do tratamento, bases legais previstas na LGPD, incluindo
        a execução de contrato e o cumprimento de obrigação legal ou regulatória.
      </p>
      <p>
        11.3. A CONTRATADA adotará medidas técnicas e administrativas razoáveis destinadas à proteção dos
        dados pessoais contra acessos não autorizados e situações acidentais ou ilícitas.
      </p>
      <p>11.4. Os dados pessoais não serão comercializados pela CONTRATADA para terceiros.</p>
      <p>
        11.5. O CONTRATANTE poderá exercer os direitos previstos na legislação de proteção de dados por meio
        dos canais oficiais de atendimento disponibilizados pela CONTRATADA, observadas as limitações e
        condições previstas em lei.
      </p>
      <p>
        11.6. Informações adicionais sobre tratamento de dados pessoais, incluindo finalidades,
        fornecedores/operadores envolvidos na prestação do serviço, armazenamento, segurança e direitos dos
        titulares, estão detalhadas na <strong>Política de Privacidade</strong> própria da plataforma, que
        integra este contrato para os fins aplicáveis.
      </p>

      <h2>12. Integrações e Serviços de Terceiros</h2>
      <p>12.1. A plataforma poderá disponibilizar integrações com serviços, sistemas, APIs e provedores externos.</p>
      <p>
        12.2. O funcionamento dessas integrações poderá depender da disponibilidade, regras, políticas,
        alterações técnicas ou condições estabelecidas pelos respectivos terceiros.
      </p>
      <p>
        12.3. A indisponibilidade ou alteração de um serviço de terceiro poderá afetar determinada
        funcionalidade da plataforma, sem que isso implique necessariamente falha da CONTRATADA.
      </p>

      <h2>13. Propriedade Intelectual</h2>
      <p>
        13.1. A plataforma <strong>Oia a Conta</strong>, incluindo seu software, código-fonte, layout, marca,
        identidade visual, bancos de dados, funcionalidades, textos, elementos gráficos e demais componentes,
        pertence à CONTRATADA ou aos respectivos titulares de direitos.
      </p>
      <p>
        13.2. A contratação concede ao CONTRATANTE uma licença de uso limitada, não exclusiva, pessoal e
        intransferível, durante o período de vigência da contratação. Detalhes adicionais sobre a licença de
        uso constam nos Termos de Uso.
      </p>
      <p>
        13.3. É vedado ao CONTRATANTE copiar, modificar, reproduzir, distribuir, comercializar, realizar
        engenharia reversa ou explorar indevidamente qualquer parte da plataforma, salvo quando expressamente
        autorizado pela legislação ou pela CONTRATADA.
      </p>

      <h2>14. Limitações de Uso</h2>
      <p>
        14.1. As condutas vedadas na utilização da plataforma (atividades ilícitas, acesso não autorizado,
        código malicioso, violação de direitos de terceiros, entre outras) estão detalhadas nos{' '}
        <strong>Termos de Uso</strong>, que integram este contrato para os fins aplicáveis.
      </p>
      <p>
        14.2. A CONTRATADA poderá adotar medidas técnicas para preservar a segurança e integridade da
        plataforma, observados os direitos do CONTRATANTE e a legislação aplicável.
      </p>

      <h2>15. Encerramento da Conta e Dados</h2>
      <p>
        15.1. Após o cancelamento, a conta poderá permanecer disponível durante o período correspondente à
        contratação já paga, conforme as condições deste contrato.
      </p>
      <p>
        15.2. Após o encerramento definitivo da conta, os dados poderão ser excluídos, anonimizados ou
        mantidos pelo período necessário para cumprimento de obrigações legais, regulatórias, exercício
        regular de direitos ou outras hipóteses autorizadas pela legislação.
      </p>
      <p>
        15.3. Sempre que tecnicamente disponível, a CONTRATADA poderá disponibilizar mecanismos para
        exportação de determinados dados antes do encerramento definitivo da conta.
      </p>

      <h2>16. Comunicações</h2>
      <p>
        16.1. As comunicações relacionadas à prestação do serviço poderão ser realizadas por meio do e-mail
        cadastrado, notificações dentro da plataforma, WhatsApp, ou outros canais oficiais disponibilizados
        pela CONTRATADA.
      </p>
      <p>16.2. O CONTRATANTE é responsável por manter seus dados de contato atualizados.</p>

      <h2>17. Alterações Deste Contrato</h2>
      <p>17.1. A CONTRATADA poderá atualizar este contrato para refletir alterações legais, regulatórias, técnicas ou comerciais.</p>
      <p>17.2. Alterações relevantes poderão ser comunicadas ao CONTRATANTE por meio dos canais disponíveis na plataforma.</p>
      <p>
        17.3. A continuidade de utilização da plataforma após a entrada em vigor das alterações, quando
        juridicamente aplicável, será considerada como ciência das novas condições, sem prejuízo dos direitos
        assegurados ao CONTRATANTE pela legislação.
      </p>

      <h2>18. Disposições Gerais</h2>
      <p>
        18.1. A eventual tolerância de uma das partes quanto ao descumprimento de qualquer obrigação não
        constituirá renúncia ou alteração das condições deste contrato.
      </p>
      <p>
        18.2. Caso qualquer disposição deste contrato seja considerada inválida ou inexigível, as demais
        disposições permanecerão válidas naquilo que não forem afetadas.
      </p>
      <p>
        18.3. Este contrato deverá ser interpretado em conjunto com os Termos de Uso, a Política de
        Privacidade e demais documentos ou condições específicas apresentadas ao CONTRATANTE no momento da
        contratação.
      </p>

      <h2>19. Foro e Legislação Aplicável</h2>
      <p>19.1. Este contrato será regido pelas leis da República Federativa do Brasil.</p>
      <p>
        19.2. Para solução de eventuais controvérsias, será observado o foro competente nos termos da
        legislação aplicável, especialmente as normas de proteção ao consumidor quando aplicáveis.
      </p>

      <h2>20. Aceite Eletrônico</h2>
      <p>
        20.1. Ao marcar a opção de aceite, clicar em <strong>&ldquo;Li e aceito os termos&rdquo;</strong>,
        criar uma conta ou concluir a contratação, o CONTRATANTE declara que teve acesso a este contrato,
        pôde consultar seu conteúdo e manifesta sua concordância com suas condições.
      </p>
      <p>
        20.2. O registro eletrônico do aceite é armazenado pela CONTRATADA para fins de comprovação da
        contratação, contendo data, horário, identificação da conta, endereço IP e a versão do documento
        aceita.
      </p>

      <p>
        <strong>Oia a Conta</strong> — Plataforma de gestão para restaurantes e delivery.<br />
        Versão do contrato: {VERSAO_CONTRATO} · Data de vigência: {DATA_VIGENCIA_DOCUMENTOS}<br />
        Canal de atendimento: {CONTATO_SUPORTE} · Site: {DOMINIO_PLATAFORMA}
      </p>
    </DocumentoLegal>
  )
}
