// IMPORTS
// ================================================================================================
import { compile } from '../index';
import { instantiate } from '@guildofweavers/air-assembly';

// SOURCE CODE
// ================================================================================================
// AirScript for verifying Merkle proofs based on Poseidon hash function
const script = Buffer.from(`
define MerkleBranch over prime field (2^128 - 9 * 2^32 + 1) {

    alpha: 5;
    MDS: [
        [214709430312099715322788202694750992687,  54066244720673262921467176400601950806, 122144641489288436529811410313120680228,  31306921464140082640306742797164216427, 175168617969612323849888177639760381562, 132141821748092528881872238908581032861],
        [ 83122512782280758906222839313578703456, 163244785834732434882219275190570945140,  65865044136286518938950810559808473518,  18180551964097663916757206212354824776, 249870759939216084597363298282234681285, 277848157012146393126919156748857149900],
        [ 12333142678723890553278650076570367543, 308304933036173868454178201249080175007,  76915505462549994902479959396659996669,  18709421677975378951783554559899201050, 194094680499515472018551780371064260782, 307996370140270198980510484883186251320], 
        [208379730163689696681819863669840588820, 139228116619884689637390357571491341686,  20697300236245124157484102630323760041, 149868860475127892585325727303994541834, 267559900028452092630277575379158932918,  82085214952496693902284543143423475908],
        [ 15202238431155429285648564568592062486, 336660456679856225851744224588562255722, 111484781404051652919056230896785744525,  19879940832183425491077957046268887076,  12604714924249352815400732976355636593,   1385111712720963900529005819570184056],
        [ 56257924185444874124459580258315826298,   6609414732577910747612629775769094818, 222516026778809277319420550386007789953, 186298854479664158795006770633754553086,  83847903426790374369611045128936398695,  18289323526456896741189879358874983848]
    ];

    require 4 input {
        secret $i0;
        secret $i1;
        secret $i2;
        secret binary $i3; // binary representation of node index
    }

    transition 12 registers {
        for each ($i0, $i1, $i2, $i3) {
            init {
                S1 <- [$i0, $i1, $i2, $i3, 0, 0];
                S2 <- [$i2, $i3, $i0, $i1, 0, 0];
                yield [...S1, ...S2];
            }

            for each ($i2, $i3) {
                init {
                    H <- $i3 ? $r[6..7] : $r[0..1];
                    S1 <- [...H, $i2, $i3, 0, 0];
                    S2 <- [$i2, $i3, ...H, 0, 0];
                    yield [...S1, ...S2];
                }

                for steps [1..4, 60..63] {
                    // full round
                    S1 <- MDS # ($r[0..5] + $k)^alpha;
                    S2 <- MDS # ($r[6..11] + $k)^alpha;
                    yield  [...S1, ...S2];
                }

                for steps [5..59] {
                    // partial round
                    S1 <- MDS # [...$r[0..4], ($r5 + $k5)^alpha];	
                    S2 <- MDS # [...$r[6..10], ($r11 + $k5)^alpha];
                    yield [...S1, ...S2];
                }
            }
        }
    }

    enforce 12 constraints {
        for all steps {
            enforce transition($r) = $n;
        }
    }

    using 6 static registers {
        // round constants
        $k0: repeat [
            101067374344786229690165777417886956455,  80879405459437789936954974293890354143, 114878919795826823010086281806730250259, 194110511991219241361342117844828731162,
             63224828526840246674964990591112663251, 123917900634392911495720210586293949218,   8960463868841581394177745196362538931, 304426686261792199045208628824939744396,
            139248743493693543574362336690677204150,  42367710866720064202792549663448540785, 189863704006068142459895777540825088442, 161611757311618464562770663978820673729,
            107848945192029541854456283059391168779, 205945359570699257407471217213049015727,  58577998438842451878897959204616513430, 147016861164463692587954908003837148977,
            221305982492077693024204261831250983058, 311509369929180010769727537078411864880,  78521800629371857648628339237793008452, 161238666861025167140079865050950554358,
             17446468832473249589930485157217490331, 311481998551130544644599040004090150785,  92147549714193116335857391734397177185, 217539743203532143846692767321358427415,
             86030224562160068798100512640813844653, 232951077157639676743371380280177008902, 175913709415803705716619900357949824830, 261249899652764326342527749765363483270,
            136895236721731160237863955081156335501,  25729267372108976141142465766251917280, 256061784799257069172948152248370917668, 330241617869611525277492863466863906645,
             20864527547596760667445415830412209351, 266674737182556924393318587340201682541, 299100026393243038088059496917679803986, 144467826623295200672890938920215853916,
             53650024446709104715533593806417336900, 314708302044209627599776627082293859828,  43502950256723853415650096463378650549,  57525810489007994888742538021110879902,
             13058034614956424559887263947101608023, 328190077753312577775773682621939159151, 189807032847186137663186136423679860475,  39060701751320577659543574472711199357,
             81925023850001828621633705481630489122,   7152231758549910619506594181158135096,  14325297747377629196605828791755247724, 332004374452129837121643952985888484203,
             18025824537757793962056989572186654862, 268404786626086703884342174729577601584, 211095382413770812378356372615992131196, 143382960599606406109305472362261873762,
            291603356473564374071024490472275442064, 250084687849010547742606548763813986225, 280932912277508864528715950021465657281,  51971894019209009592980666732511642958,
            206950131324393081926625619796035744582,  95615781941918399854163510808341924472, 171822440080327417088447045071466131586, 277234655940675821426186144331685295807,
            324791847902087761363440434821675875407, 168102201305841257335981148047283081691, 288639704217144348976096291295178742106,  90806409925269165054906435000756098395
        ];
        $k1: repeat [
            146765449460473874529902349042422029282,  98885934149842051859154927621653227231, 181855717760526754006191770137229284832, 228247769650141808714014297889797680647,
             13578873195485401654248572666846172242,  70760289434084172441897759483957239610, 188760295256568875961511459777252273397, 184032888031378822742104532169963736593,
            252311626103440610452435740719082430192,  88660088865945662432425199133055719166,  40656828413615935820919738981226995022,  47605556286951219882396631419748027969,
            216818899956135536043740480638560153986, 213949618424850854090190213667468025888, 293295466157092545901161709078345148800, 283736605655444841548057116715795094909,
            141804875477763201884632744817477142856, 154132846112644213162877577305001225511, 302370437180100286259669260226931255415, 235065884863985635853908886392838728028,
             37998809572015702533317462086404402958,   7643451611338337340435241281556526660,  90373027270972543200849272540156681200, 162492611704225977679807475255297391457,
            187698148037256142832585028103191274512, 218355169036883684354948971773610834806, 284252182207710226928526862613708677058, 113548005864628114124430901471053370216,
             46415050994359662698544085246970016745, 251455601063515157264374248471890566906, 297300229883234520698321917468060733020, 217394300372290045057684361830229716930,
            122676391544325878990832232077185932571,  41309465042903436981104157522009455155, 273594044486691376571044206011156953384,  44839502903564227942811854793151023446,
             74423022738538774897981935370714257286, 271291276042376378083780143123526466774,  71476786563984446844128376381305130656,  29640915879266550904062401032536422400,
             19575528957034261479275179258706669261, 294631021803213732411788179486634084783, 138925321941351272405699707203262294702, 237323122250362323645263450831429970714,
            144019537293205050602492711125457395590,  46076056844981127266256864937067773235, 336418096251600711540697148214100933714,  42874408598497847228753788664171436274,
             27919976958798018490075553022994551829, 140307051062016970253950324712110115792, 106979032634720966204342887750183339734, 156413667729526262986394517092912328360,
            333989808208312319762320587225045718843,  76397712518175975649933337700991232712,  46979621983159368615356155284664992851,  19332704662145457289650602831030912387,
            328746407515206210640306817673011922342, 327710974875427887276499430764991090814, 117013198937809487792632081716569155645, 165812270170922167348736917895258542057,
            232600483149797706911492174057990576850, 199110375427974783919488944523494635413,  48442040342408131149393217974317281471, 155072693974545348194800678487220366186
        ];
        $k2: repeat [
            188918174955023395574394659362380216945, 275443395862792216728627702308701886138, 176914867893722931358620076111891805615, 177610982494044061776647121226227975409,
            291916955530912322309733271565564511332, 289466531682335742105153049709808805978, 194589253754193407998905368760571739262, 136152832913116532980571643773440984648,
            230316251190186772094018169418063670618,  35888942284942224553531390726640183499, 179855520578612030164778843931303242659, 297000831966727251238564718044302174621,
            340230749785602664559546975551889050580,  65679664426547362493119348244825148715, 338007441305937213330164891051600062676, 186506691377216141093732006776809535340,
            266083496202897572599786752224989813161, 196169391760449960749680739550989998676, 107327529195524785922076970134413617817, 241658307432605782658590435256729833348,
            182481232544779909483010208823509553132, 163285088220216032474266013394365809175,  47981236253638513408972379544463089685, 166920499885118430646444773696799783127,
            219245357136371580140802547968716048263, 231793417223306239786383013527788012076, 170422859909281586225441950177639557783, 261519178593116333071877689025474749162,
            114230967201961470945431392272142729341, 230076387858459704843613099073958133212,  67759771743183883930598537075463268782, 241908616864155373359491296588583682861,
            233061209595687610466191844893141105040, 218371483684286396328299737873511498483,  36550628485942654329062892709195458063,  92214213337749328984711783246794502523,
              3168800276537054898110381255465533297, 326575588608412119045583375286687915333, 212875511818069030362495339329097703976, 167096301921610614898986238556191707732,
            205247458858758940736953179174707923243, 173587754339706937524073877903408460586, 223588211727152379866375127231513620287,  50063399800108516218376391743942566408,
             69458768305830091324528254522872434896, 284773068108374435398871854665371514718, 238013987280453700802559540186419988349, 265060979542019248681577265250583144723,
             83341075546949663214020636936757059923,  62611275032274779381472878584994068091, 227534937150619656950127462090805595830, 236071975062071407109602863981109551224,
            214127115536148699321195351898434127751, 103970646247131519737483439174049713335,  70114627566783507264155492988688696502,  36923240075634032166549054382612943016,
            176084434827103307651985776911991542584,  12565507784290547602436748337619204623,  91115543217611233951442454717238832139, 265534128830674393997130682664805551789,
            218948853745936232138080466342482485501, 174130439341144675015327383421466502844, 138812831488224295653547910491898549731, 173379207678560748338719952520452326669
        ];
        $k3: repeat [
            322051539143308178784018947861271504186, 166621021498946425309990886178572593836, 267561759937249094744289925169260312494, 107986555924182681758004321386075124502,
            167399370105366126705585143377761292833, 248992341480614790028293769864567645303,   8101488426690001440408100245673215218,  48993774262478364717773155802266608884,
            291279889149987731543504742574693814990,  86060040593225944795613201189716366383, 197583782112658785734683085263893120316, 196931671468680290178573409026215179058,
            173655304690229187926998680457570363125, 147825099656638281024623693396710147040, 161917161421570397607687931718629148072, 215327558933510716152631939565165418773,
            323585049507086115168593556573867551841, 156774305225210999040365434156661973875, 303410954489016154925319771056410784790, 281058165548587689299846367255233412598,
            117782486411702406456147958118627810962, 279716539010539271215865135391244112598, 280710885259895104937796435358384290228, 136655932048224681500323820246811483935,
             72691901656253597923198296013451195433, 249312899481814928733954764459695627065,  88000320801772984864038892128909494901, 256980419007077580503302920676982513097,
            278835700297515366086396437808921707517, 267323764062650153023605282298500286542,  83025869683936384628904993855895748660, 142024361460738638773024784097801099645,
            237447916751108439225112203850685705393,  30668880322326104132880114360467889625,  74315892311024687647678282604163886768, 176483113156445402033847830307314781492,
            249749688158608299451061778660289839142, 242507158168794791147103560412407151455, 133855400025011516752997073432969759003, 181232274350949584998344024117013518080,
            260134341632380614700611306538692462476,  96437897748746886320527183367028139389, 324347207945354429796524762643689076360, 333418790736766213321670372829282750884,
            281766870140166485066458730415874270739, 157693619979339878516830668173768111990, 330932317132142024049817056754379070643,  17817568712442764200921505332563929571,
            267592453659220085856118993628092025650, 104674601630117300551394348565710855092, 332491856308981743904759127757258596779, 337515620056148781344260099449777733902,
             73494965571440368887938531007781042561, 327044142249839989413491812941858300280, 106007449701734921293734498660422415723, 140535419493430158854361037444787177919,
            176532610003116971111145608997072344389, 302673463197968751023580286547106577639, 233527500597402768838202447346622943267, 293917971493920244765627382329414010909,
            108793370563150261248590214059682196693, 122674133127551038340152749428308319090, 197099182152929546598599279772638498112, 148036161267272785717565205431114431153
        ];
        $k4: repeat [
             13573466009239340031362932395458186440, 205979145374097025879144929541132699058,  65293524936181066378852614699982653792, 158320431039819013724056153361250437299,
              7080580844672508110591543268327372330,  37966229549161867448320821572059478826, 198229630880481881035294219349336090081, 288398122419202843810193941214959791201,
            195998459800806913137866489475817358908, 294270665828543587053186257696298010838, 171304287775986339875130964966258637028, 190788745517781011708299328686422201963,
             55845248645914669770041466941573058650,  63182438708244983635607000093651816239, 332165454105302266870168482340776221295,  43557372990102883437835836847469664166,
              8316499313216746360573398340532093282, 141742639916673009847590303472654389647, 251012012686788495091249610427026420806,  55599039443712394674938093918412528042,
             89645159866260880302089479920657850346, 318801627723634633320424781856311097412, 146735124489630731633339883024098856957, 113455031404175343881295905992426513340,
            155705458352793817275982716402764587668, 324926020570376787111091593861555511152, 168302547773443965770323533167888055386, 169155478632517926997536461853615508336,
            134025807821560463161388080754233795157, 283823359027202385047408516959737916101, 283181848011071358889371180294740301777, 305547359509546561742787034377392910472,
            184005750911795441087079780275686525183, 323964796835142476501873929711637972189, 134558935355446645321147944118664474653, 124246369207418333696835316787440598420,
            320342818838371211825541502612119960670, 222348296049919095865670874161088329069, 158598348170419676031469012808042892890, 286243578428821870770995180564294469191,
            290971518500043571049440894174656868599, 328223976769033802189310613119586152195,   3999828478002951930867862084337417593,  45383798085494509958947696604937474542,
            288379667682067170519128187046101992642, 302831713499035362801406192340336919165, 151692200937260845909270692210139066508, 298752378976462246100720482080464679502,
            252900645401104423353173504169311239008, 303065209544956717342976431799804378965,  99295086668786363624354919498614454276, 286074262822340888873496854784988308229,
            319528576595856991598753610665782483560, 144299547442182878439618887417565727967,  22039677121213229762967483091807765873, 157132179765741501711255154296251513522,
            297646377057835801271184664905132678204,  82393938476425743527812475541089712179,  16661192295846264705052508409367927158, 167849873005150578454445549871417666750,
             89966058662292616735291574620126239300, 262616912494129873653420878979741818048, 238753592679277474904880508952193285114,   5649285330622065464039861825794373790
        ];
        $k5: repeat [
            217649182917826081035481873751122644291, 152659039879460956859694768201267262463, 137429565044406538681943564087558135845, 202165172985221136229062188263893600461,
            248696722457267566212498387820864867877, 150943748555894073220377716092322651874, 201979794187496251505649688393833078032, 275154958006426248908039217032764719630,
            127194797080986880004102995466029371133,   2209197978733044107261235981369767183, 194640849478394046077871184940261405523, 162954170031470749516430651526575452664,
            165358612228327484289881360331318185588, 203711423143707083166070958655025869710, 237519337087790246298834395607985331028,  34059114160159201903882098232062435492,
            127455802439376130126678665947075383730, 287291927543030668420336828037391880039, 282585837639092028722180009291150499375, 230844324778754129279786787870517415398,
            279820312581995046028660546259530937922, 245225006985133879871729977409233103774,  73487483003009296222650829340075137226, 240224956822876274753449371064884172823,
             96647877590709694191702588228166778700, 215010113263800903779159821764601955732, 318679004030021278318014607085137921688, 165941769797065377768197016687666663400,
            298345005564579884786581323629122246614, 260070759149685321338950853753960310563,   4073159995217021243345828151441104537, 281435152380630123136371016826322565886,
             15053338024111283862952039570536930143,  97696402979299570146317646878581128635, 227149673141291645870557592183404853703, 158825599617831981275183621100453953990,
            165550854785797097064631088017955974598, 196094838913676642455003815699195897552,  12471202079685672083969195400684135889,  68092969130864843778123527229466523636,
            252368490594562270438628046459852923778, 332349509241050893517328066351324897738, 286090582778110982922440940741795955761, 146135621726918432514452477742632803730,
            255008750736266519906284942068634948957,  15208944972146277157305882239712346249, 133606736801290531453611694948088749014,  11289743728013216216038493297234877448,
            313699630558646044627564693549578816106,  31816160939688152446708490299693525691, 115217048396017125790159756284295350573, 140263580074964836669932953177058052868,
            218340341506586242113056561105243130552, 127472582990730958666086207582548983269,  77860944307343808978448459454863446359,   2984531188504870932535313067179875172,
            148507452292217141985772126627838141051, 101251110998513932327276943847732839776, 211024867083575274409129844805128749800,  60547481239644037526963976769333891530,
            109278179079351143115403099034335745694,  24852917395312509198291328054688200241, 279427576079217490864333679822156298714, 219581809362599988307567867986801814488
        ];
    }
}`);

// TESTING
// ================================================================================================
const extensionFactor = 32;

const schema = compile(script);
const air = instantiate(schema, { extensionFactor, wasmOptions: true });
console.log(`degree: ${air.maxConstraintDegree}`);

const gStart = Date.now();
let start = Date.now();
const pContext = air.initProvingContext([[42n, 43n, [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n], [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n]]]);
console.log(`Initialized proof object in ${Date.now() - start} ms`);

start = Date.now();
const trace = pContext.generateExecutionTrace();
console.log(`Execution trace generated in ${Date.now() - start} ms`);

start = Date.now();
const pPolys = air.field.interpolateRoots(pContext.executionDomain, trace);
console.log(`Trace polynomials computed in ${Date.now() - start} ms`);

start = Date.now();
const pEvaluations = air.field.evalPolysAtRoots(pPolys, pContext.evaluationDomain);
console.log(`Extended execution trace in ${Date.now() - start} ms`);

start = Date.now();
const cEvaluations = pContext.evaluateTransitionConstraints(pPolys);
console.log(`Constraints evaluated in ${Date.now() - start} ms`);

const hRegisterValues = pContext.secretRegisterTraces;

start = Date.now();
const qPolys = air.field.interpolateRoots(pContext.compositionDomain, cEvaluations);
const qEvaluations = air.field.evalPolysAtRoots(qPolys, pContext.evaluationDomain);
console.log(`Extended constraints in ${Date.now() - start} ms`);
console.log(`Total time: ${Date.now() - gStart} ms`);

start = Date.now();
const vContext = air.initVerificationContext(pContext.inputShapes, [[0n, 1n, 0n, 1n, 0n, 1n, 0n, 1n]]);
console.log(`Initialized verification object in ${Date.now() - start} ms`);

const x = air.field.exp(vContext.rootOfUnity, 2n);
const rValues = [
    pEvaluations.getValue(0, 2), pEvaluations.getValue(1, 2), pEvaluations.getValue(2, 2), pEvaluations.getValue(3, 2),
    pEvaluations.getValue(4, 2), pEvaluations.getValue(5, 2), pEvaluations.getValue(6, 2), pEvaluations.getValue(7, 2),
    pEvaluations.getValue(8, 2), pEvaluations.getValue(9, 2), pEvaluations.getValue(10, 2), pEvaluations.getValue(11, 2)
];
const nValues = [
    pEvaluations.getValue(0, 34), pEvaluations.getValue(1, 34), pEvaluations.getValue(2, 34), pEvaluations.getValue(3, 34),
    pEvaluations.getValue(4, 34), pEvaluations.getValue(5, 34), pEvaluations.getValue(6, 34), pEvaluations.getValue(7, 34),
    pEvaluations.getValue(8, 34), pEvaluations.getValue(9, 34), pEvaluations.getValue(10, 34), pEvaluations.getValue(11, 34)
];
const hValues = [
    hRegisterValues[0].getValue(2), hRegisterValues[1].getValue(2), hRegisterValues[2].getValue(2), hRegisterValues[3].getValue(2)
];
const qValues = vContext.evaluateConstraintsAt(x, rValues, nValues, hValues);

console.log(qEvaluations.getValue(0, 2) === qValues[0]);

console.log('done!');