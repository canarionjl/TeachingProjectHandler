import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TeachingProjectHandler } from "../target/types/teaching_project_handler";
import chai, { assert } from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import * as CryptoJS from 'crypto-js';
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";


chai.use(chaiAsPromised);

// helper functions
const createWallet = async (connection: anchor.web3.Connection, funds: number)
  : Promise<anchor.web3.Keypair> => {
  const wallet = anchor.web3.Keypair.generate();
  const tx = await connection.requestAirdrop(
    wallet.publicKey,
    anchor.web3.LAMPORTS_PER_SOL * funds
  );
  // wait for confirmation
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: tx
  });

  // check balance
  const balance = await connection.getBalance(wallet.publicKey);
  if (balance < funds) {
    throw new Error("Requested amount exceeds target" +
      "network's airdrop limit.");
  }
  return wallet;
};

const getExtraFunds = async (connection: anchor.web3.Connection, funds: number, wallet: anchor.web3.Keypair) => {
  const tx = await connection.requestAirdrop(
    wallet.publicKey,
    anchor.web3.LAMPORTS_PER_SOL * funds
  );
}

const initializeHighRank = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair): Promise<String> => {

  const pda = await findPDAforHighRank(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "highRank")

  const result = await program.methods.createHighRank("1111")
    .accounts({
      authority: authority.publicKey,
      highRankIdHandler: id_generator_pda,
      highRankAccount: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeProfessor = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair): Promise<String> => {

  const pda = await findPDAforProfessor(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "professor")

  const result = await program.methods.createProfessor("2222")
    .accounts({
      authority: authority.publicKey,
      professorIdHandler: id_generator_pda,
      professorAccount: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeStudent = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair): Promise<String> => {

  const pda = await findPDAforStudent(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "student")

  const result = await program.methods.createStudent("3333")
    .accounts({
      authority: authority.publicKey,
      studentIdHandler: id_generator_pda,
      studentAccount: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeIdGenerator = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, specification: string): Promise<String> => {

  const id_generator_pda = await findPDAforIdGenerator(program.programId, specification)

  const result = await program.methods.createIdGeneratorFor(specification)
    .accounts({
      authority: authority.publicKey,
      specificationIdHandler: id_generator_pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeFaculty = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id: number, name: string): Promise<String> => {

  const pda = await findPDAforFaculty(program.programId, id)
  const high_rank_pda = await findPDAforHighRank(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "faculty")


  const result = await program.methods.createFaculty(name)
    .accounts({
      authority: authority.publicKey,
      facultyIdHandler: id_generator_pda,
      highRank: high_rank_pda,
      facultyAccount: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeDegree = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id: number, name: string, faculty_id: number): Promise<String> => {

  const pda = await findPDAforDegree(program.programId, id)
  const high_rank_pda = await findPDAforHighRank(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "degree")
  const faculty_id_generator_pda = await findPDAforIdGenerator(program.programId, "faculty")


  const result = await program.methods.createDegree(name, faculty_id)
    .accounts({
      authority: authority.publicKey,
      degreeIdHandler: id_generator_pda,
      facultyIdHandler: faculty_id_generator_pda,
      highRank: high_rank_pda,
      degreeAccount: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeSpecialty = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id: number, name: string, degree_id: number): Promise<String> => {

  const pda = await findPDAforSpecialty(program.programId, id)
  const high_rank_pda = await findPDAforHighRank(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "specialty")
  const degree_id_generator_pda = await findPDAforIdGenerator(program.programId, "degree")
  

  const result = await program.methods.createSpecialty(name, degree_id)
    .accounts({
      authority: authority.publicKey,
      specialtyIdHandler: id_generator_pda,
      degreeIdHandler: degree_id_generator_pda,
      highRank: high_rank_pda,
      specialtyAccount: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeSubject = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id: number, name: string, degree_id: number, specialty_id: number, course: any, professors: Array<number>): Promise<String> => {

  const pda = await findPDAforSubject(program.programId, id)
  const high_rank_pda = await findPDAforHighRank(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "subject")
  const degree_id_generator_pda = await findPDAforIdGenerator (program.programId, "degree")
  const specialty_id_generator_pda = await findPDAforIdGenerator (program.programId, "specialty")


  const result = await program.methods.createSubject(name, degree_id, specialty_id, course , professors)
    .accounts({
      authority: authority.publicKey,
      subjectIdHandler: id_generator_pda,
      degreeIdHandler: degree_id_generator_pda,
      specialtyIdHandler: specialty_id_generator_pda,
      highRank: high_rank_pda,
      subjectAccount: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}
const getAllAccountsByAuthority = async (accounts: anchor.AccountClient<TeachingProjectHandler>, authority: anchor.web3.PublicKey) => {
  return await accounts.all([
    {
      memcmp: {
        offset: 8,
        bytes: authority.toBase58()
      }
    }
  ]);
}

const findPDAforHighRank = async (programId: anchor.web3.PublicKey, authority: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {

  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("highRank"), authority.toBytes()],
    programId
  );
  return pda;
}

const findPDAforProfessor = async (programId: anchor.web3.PublicKey, authority: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {

  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("professor"), authority.toBytes()],
    programId
  );
  return pda;
}

const findPDAforStudent = async (programId: anchor.web3.PublicKey, authority: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {

  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("student"), authority.toBytes()],
    programId
  );
  return pda;
}

const findPDAforIdGenerator = async (programId: anchor.web3.PublicKey, account_info: string): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode(account_info + 'IdHandler')],
    programId
  );
  return pda;
}

const findPDAforFaculty = async (programId: anchor.web3.PublicKey, id: Number): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("faculty"), numberToLEBytes(id)],
    programId
  );
  return pda;
}

const findPDAforDegree = async (programId: anchor.web3.PublicKey, id: Number): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("degree"), numberToLEBytes(id)],
    programId
  );
  return pda;
}

const findPDAforSpecialty = async (programId: anchor.web3.PublicKey, id: Number): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("specialty"), numberToLEBytes(id)],
    programId
  );
  return pda;
}

const findPDAforSubject = async (programId: anchor.web3.PublicKey, id: Number): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("subject"), numberToLEBytes(id)],
    programId
  );
  return pda;
}

const fetchHighRankAccount = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.PublicKey) => {
  return await program.account.highRank.fetch(await findPDAforHighRank(program.programId, authority))
}

const fetchProfessorAccount = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.PublicKey) => {
  return await program.account.professor.fetch(await findPDAforProfessor(program.programId, authority))
}

const fetchFacultyAccount = async (program: Program<TeachingProjectHandler>, id: Number) => {
  return await program.account.faculty.fetch(await findPDAforFaculty(program.programId, id))
}

const fetchDegreeAccount = async (program: Program<TeachingProjectHandler>, id: Number) => {
  return await program.account.degree.fetch(await findPDAforDegree(program.programId, id))
}

const fetchSpecialtyAccount = async (program: Program<TeachingProjectHandler>, id: Number) => {
  return await program.account.specialty.fetch(await findPDAforSpecialty(program.programId, id))
}

const fetchSubjectAccount = async (program: Program<TeachingProjectHandler>, id: Number) => {
  return await program.account.subject.fetch(await findPDAforSubject(program.programId, id))
}

const fetchStudentAccount = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.PublicKey) => {
  return await program.account.student.fetch(await findPDAforStudent(program.programId, authority))
}

const fetchIdAccount = async (program: Program<TeachingProjectHandler>, account_info: string) => {
  return await program.account.idHandler.fetch(await findPDAforIdGenerator(program.programId, account_info))
}

const getReturnLog = (confirmedTransaction) => {
  const prefix = "Program return: ";
  let log = confirmedTransaction.meta.logMessages.find((log) =>
    log.startsWith(prefix)
  );
  log = log.slice(prefix.length);
  const [key, data] = log.split(" ", 2);
  const buffer = Buffer.from(data, "base64");
  return [key, data, buffer];
};

function numberToLEBytes(number) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, number, true);
  const bytes = new Uint8Array(buffer);
  return bytes;
}


// test suite
describe("Testing the Teaching Project Handler Smart Contract...\n\n", () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());


  // shared objects
  const program = anchor.workspace.TeachingProjectHandler as Program<TeachingProjectHandler>;
  const connection = anchor.getProvider().connection;
  let wallet1: anchor.web3.Keypair;
  let wallet2: anchor.web3.Keypair;
  let wallet3: anchor.web3.Keypair;


  before(async () => {

    wallet1 = await createWallet(connection, 10); // HighRank
    wallet2 = await createWallet(connection, 10); // Professor
    wallet3 = await createWallet(connection, 10); // Student

  });

  it("HighRank is initializated properly", async () => {

    var idExpected = 0;
    try {
      let highRankIdGeneratorBefore = await fetchIdAccount(program, "highRank");
      idExpected = highRankIdGeneratorBefore.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
    }

    const newIdAvailable = idExpected + 1

    const signature = await initializeHighRank(program, wallet1);
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);
    const accountWallet1 = await fetchHighRankAccount(program, wallet1.publicKey);
    const highRankIdGeneratorAfter = await fetchIdAccount(program, "highRank");

    expect(new anchor.BN(accountWallet1.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(highRankIdGeneratorAfter.smallerIdAvailable).eq(new anchor.BN(newIdAvailable))).to.be.true;
    assert.equal(accountWallet1.identifierCodeHash, CryptoJS.SHA256("1111").toString());
    expect(Boolean(buffer)).to.be.true;

  });

  it("Professor is initializated properly", async () => {
    var idExpected = 0;
    try {
      let professorIdGeneratorBefore = await fetchIdAccount(program, "professor");
      idExpected = professorIdGeneratorBefore.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
    }

    const signature = await initializeProfessor(program, wallet2);
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);
    const accountWallet2 = await fetchProfessorAccount(program, wallet2.publicKey);


    expect(new anchor.BN(accountWallet2.id).eq(new anchor.BN(idExpected))).to.be.true;
    assert.equal(accountWallet2.identifierCodeHash, CryptoJS.SHA256("2222").toString());
    expect(Boolean(buffer)).to.be.true;

  });

  it("Reinitializing the same professor with different ID...", async () => {

    try {
      await initializeProfessor(program, wallet2);
    } catch (err) {
      assert.instanceOf(err, Error);
      return;
    }

    assert.fail("Expected an error to be thrown");

  });

  it("Student is initializated properly", async () => {

    var idExpected = 0;
    try {
      let studentIdGeneratorBefore = await fetchIdAccount(program, "student");
      idExpected = studentIdGeneratorBefore.smallerIdAvailable;
    } catch (err) {
      assert.instanceOf(err, Error);
    }
    const newIdAvailable = idExpected + 1;

    const signature = await initializeStudent(program, wallet3);
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);
    const accountWallet3 = await fetchStudentAccount(program, wallet3.publicKey);

    const studentIdGeneratorAfter = await fetchIdAccount(program, "student");

    expect(new anchor.BN(accountWallet3.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(studentIdGeneratorAfter.smallerIdAvailable).eq(new anchor.BN(newIdAvailable))).to.be.true;
    assert.equal(accountWallet3.identifierCodeHash, CryptoJS.SHA256("3333").toString());
    expect(Boolean(buffer)).to.be.true;

  });

  it("Faculty is properly initializated", async () => {

    getExtraFunds(connection, 50, wallet1) //wallet1 is allowed by a HighRank
    var correct = true;
    var idExpected = 0;

    try {
      const account = await fetchIdAccount(program, "faculty");
      idExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
      correct = false;
    }

    if (!correct) {
      await initializeIdGenerator(program, wallet1, "faculty")
    }

    const signature = await initializeFaculty(program, wallet1, idExpected, "Asignatura de prueba")
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);
    const accountWallet = await fetchFacultyAccount(program, idExpected);
    const idGeneratorAccount = await fetchIdAccount(program, "faculty");

    expect(new anchor.BN(accountWallet.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(idGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;
    expect(Boolean(buffer)).to.be.true;
  });


  it("Degree is properly initializated", async () => {

    getExtraFunds(connection, 50, wallet1) //wallet1 is allowed by a HighRank
    var correct = true;
    var idExpected = 0;

    try {
      const account = await fetchIdAccount(program, "degree");
      idExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
      correct = false;
    }

    if (!correct) {
      await initializeIdGenerator(program, wallet1, "degree")
    }

    const signature = await initializeDegree(program, wallet1, idExpected, "Grado de prueba perteneciente a Facultad con id=0", 0)
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);
    const accountWallet = await fetchDegreeAccount(program, idExpected);
    const idGeneratorAccount = await fetchIdAccount(program, "degree");

    expect(new anchor.BN(accountWallet.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(idGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;
    expect(Boolean(buffer)).to.be.true;
  });

  it("Specialty is properly initializated", async () => {

    getExtraFunds(connection, 50, wallet1) //wallet1 is allowed by a HighRank
    var correct = true;
    var idExpected = 0;

    try {
      const account = await fetchIdAccount(program, "specialty");
      idExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
      correct = false;
    }

    if (!correct) {
      await initializeIdGenerator(program, wallet1, "specialty")
    }

    const signature = await initializeSpecialty(program, wallet1, idExpected, "Especialidad de prueba", 0)
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);
    const accountWallet = await fetchSpecialtyAccount(program, idExpected);
    const idGeneratorAccount = await fetchIdAccount(program, "specialty");

    expect(new anchor.BN(accountWallet.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(idGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;
    expect(Boolean(buffer)).to.be.true;
  });

  it("Specialty with incorrect ID trying to be initializated", async () => {

    getExtraFunds(connection, 50, wallet1) //wallet1 is allowed by a HighRank
    var correct = true;
    var idExpected = 0;

    try {
      const account = await fetchIdAccount(program, "specialty");
      idExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
      correct = false;
    }

    if (!correct) {
      await initializeIdGenerator(program, wallet1, "specialty")
    }

    let signature: String;

    try {
      signature = await initializeSpecialty(program, wallet1, idExpected, "Especialidad de prueba", -1)
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "A raw constraint was violated");
      return;
    }

    assert.fail("Expected an error to be thrown");

  });

  it("Subject is properly initializated", async () => {

    getExtraFunds(connection, 50, wallet1) //wallet1 is allowed by a HighRank
    var correct = true;
    var idExpected = 0;

    try {
      const account = await fetchIdAccount(program, "subject");
      idExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
      correct = false;
    }

    if (!correct) {
      await initializeIdGenerator(program, wallet1, "subject")
    }

    const signature = await initializeSubject(program, wallet1, idExpected, "Especialidad de prueba", 0, 0, { first:{} }, [1,2,3])
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);
    const accountWallet = await fetchSubjectAccount(program, idExpected);
    const idGeneratorAccount = await fetchIdAccount(program, "subject");

    console.log(accountWallet)

    expect(new anchor.BN(accountWallet.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(idGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;
    expect(new anchor.BN(accountWallet.degreeId).eq(new anchor.BN(0))).to.be.true;
    expect(accountWallet.course).to.deep.equal( {first: {} } );                                                  // utilizamos deep para comparar el contenido real de los objetos y no la referencia a memoria (esto últ siempre daría false ya que son dos objetos diferentes)
    expect(Boolean(buffer)).to.be.true;
  });


});
