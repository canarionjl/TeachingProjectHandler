import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TeachingProjectHandler } from "../target/types/teaching_project_handler";
import chai, { assert } from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import CryptoJS from 'crypto-js';
import * as Borsh from 'borsh';
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { ConfirmOptions } from "@solana/web3.js";



chai.use(chaiAsPromised);
const confirmOptions: ConfirmOptions = { commitment: "confirmed" };

// helper functions
const createWallet = async (connection: anchor.web3.Connection, funds: number): Promise<anchor.web3.Keypair> => {
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
}

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

const initializeSubject = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id: number, name: string, degree_id: number, specialty_id: number, course: any, professors: Array<number>, students: Array<number>): Promise<String> => {

  const pda = await findPDAforSubject(program.programId, id)
  const high_rank_pda = await findPDAforHighRank(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "subject")
  const degree_id_generator_pda = await findPDAforIdGenerator (program.programId, "degree")
  const specialty_id_generator_pda = await findPDAforIdGenerator (program.programId, "specialty")
  const professor_id_generator_pda = await findPDAforIdGenerator (program.programId, "professor")
  const student_id_generator_pda = await findPDAforIdGenerator (program.programId, "student")


  const result = await program.methods.createSubject(name, degree_id, specialty_id, course , professors, students)
    .accounts({
      authority: authority.publicKey,
      subjectIdHandler: id_generator_pda,
      degreeIdHandler: degree_id_generator_pda,
      specialtyIdHandler: specialty_id_generator_pda,
      professorIdHandler: professor_id_generator_pda,
      studentIdHandler: student_id_generator_pda,
      highRank: high_rank_pda,
      subjectAccount: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const voteProposalByStudent = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, proposal_id: number, subject_id:number, vote: boolean): Promise<String> => {

  const subject_pda = await findPDAforSubject(program.programId, subject_id)
  const subject_id_generator_pda = await findPDAforIdGenerator(program.programId, "subject")
  const student_pda = await findPDAforStudent(program.programId, authority.publicKey)
  const proposal_pda = await findPDAforProposal(program.programId, proposal_id)
  const id_professor_generator_pda = await findPDAforIdGenerator(program.programId, "professorProposal")

  const result = await program.methods.voteProposalByStudent(vote)
    .accounts({
      authority: authority.publicKey,
      votingStudent: student_pda,
      subjectIdHandler: subject_id_generator_pda,
      proposalAccount: proposal_pda,
      subjectAccount: subject_pda,
      professorProposalIdHandler: id_professor_generator_pda
    })
    .signers([authority])
    .rpc(confirmOptions);

  return result;
}

const initializeProposalByStudent = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id: number, title: string, content: string, subject_id: number): Promise<String> => {

  const pda = await findPDAforProposal(program.programId, id)
  const student_pda = await findPDAforStudent(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "proposal")
  const subject_pda = await findPDAforSubject(program.programId, subject_id)
  const subject_id_generator_pda = await findPDAforIdGenerator (program.programId, "subject")



  const result = await program.methods.createProposalByStudent(title, content)
    .accounts({
      authority: authority.publicKey,
      studentCreator: student_pda,
      proposalIdHandler: id_generator_pda,
      subjectIdHandler :subject_id_generator_pda,
      proposalAccount: pda,
      subjectAccount: subject_pda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return result;
}

const initializeProposalByProfessor = async (program: Program<TeachingProjectHandler>, authority: anchor.web3.Keypair, id: number, title: string, content: string, subject_id: number): Promise<String> => {

  const pda = await findPDAforProposal(program.programId, id)
  const professor_pda = await findPDAforProfessor(program.programId, authority.publicKey)
  const id_generator_pda = await findPDAforIdGenerator(program.programId, "proposal")
  const subject_pda = await findPDAforSubject(program.programId, subject_id)
  const subject_id_generator_pda = await findPDAforIdGenerator (program.programId, "subject")



  const result = await program.methods.createProposalByProfessor(title, content)
    .accounts({
      authority: authority.publicKey,
      professorCreator: professor_pda,
      proposalIdHandler: id_generator_pda,
      subjectIdHandler :subject_id_generator_pda,
      proposalAccount: pda,
      subjectAccount: subject_pda,
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

const findPDAforProposal = async (programId: anchor.web3.PublicKey, id: Number): Promise<anchor.web3.PublicKey> => {
  const [pda, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [utf8.encode("proposal"), numberToLEBytes(id)],
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

const fetchProposalAccount = async (program: Program<TeachingProjectHandler>, id: Number) => {
  return await program.account.proposal.fetch(await findPDAforProposal(program.programId, id))
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

const getEmittedLog = (confirmedTransaction) => {
  const prefix = "Program data: ";
  let log = confirmedTransaction.meta.logMessages.find((log) =>
    log.startsWith(prefix)
  );
  log = log.slice(prefix.length);
  const buffer = Buffer.from(log, "base64");
  return [log, buffer];
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
  let wallet4: anchor.web3.Keypair;
  let alternativeWallet: anchor.web3.Keypair;


  before(async () => {

    wallet1 = await createWallet(connection, 10); // HighRank
    wallet2 = await createWallet(connection, 10); // Professor
    wallet3 = await createWallet(connection, 10); // Student

    wallet4 = await createWallet(connection,10) //Professor

  });

  it("HighRank is initializated properly", async () => {

    /*
     * Check if ID's generator for HighRank accounts exist --> 
     * If so, the smaller ID available is obtained from it 
     * If not, the new ID will be 0 since no ID's generator created implies no HighRank Account has been created previously
    */
    var idExpected = 0;
    try {
      let highRankIdGeneratorBefore = await fetchIdAccount(program, "highRank");
      idExpected = highRankIdGeneratorBefore.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
    }

    //The new ID that should be available in the ID's generator after creating the new HighRank account
    const newIdAvailable = idExpected + 1

    //Initializing HighRankAccount and getting the signature of the transaction
    const signature = await initializeHighRank(program, wallet1);

    //Confirming the previous transaction in the validator node
    await connection.confirmTransaction(signature.toString())

    //Getting all the information relative to the transaction that has been carried out
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });

    /* Getting the Return Log from the transaction information in order to get the boolean returned from the SC (Rust) function
     * 'buffer' contains the raw binary information of the return, which contains the information of the boolean returned by the tested method
    */
    const [key, data, buffer] = getReturnLog(transaction);
    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    //Fetching the data of the new account created through its PDA
    const newHighRankAccount = await fetchHighRankAccount(program, wallet1.publicKey);

    //Getting the data of the HighRank ID's generator
    const highRankIdGeneratorAfterCreating = await fetchIdAccount(program, "highRank");


    //The ID of the new HighRank Account must be equal to the idExpected param (which is the ID provided by the ID's generator for HighRank)
    expect(new anchor.BN(newHighRankAccount.id).eq(new anchor.BN(idExpected))).to.be.true;

    // The new smaller availabled ID on the ID's generator must be equal to the param newIdAvailable (i.e. the new id available must have been incremented in +1)
    expect(new anchor.BN(highRankIdGeneratorAfterCreating.smallerIdAvailable).eq(new anchor.BN(newIdAvailable))).to.be.true;

    // The identifierCode hash must be equal to the sha256 hash of '1111' (which is the identifier of every highRank to have certain privileges)
    assert.equal(newHighRankAccount.identifierCodeHash, CryptoJS.SHA256("1111").toString());

    // The program must return true if everything is correct
    expect(program_return).to.be.true;

  });

  it("Professor is initializated properly", async () => {

     /*
     * Check if ID's generator for Professor accounts exist --> 
     * If so, the smaller ID available is obtained from it 
     * If not, the new ID will be 0 since no ID's generator created implies no Professor Acccount has been created previously
    */
    var idExpected = 0;
    try {
      let professorIdGeneratorBefore = await fetchIdAccount(program, "professor");
      idExpected = professorIdGeneratorBefore.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
    }

    //The new ID that should be available in the ID's generator after creating the new Professor account
    const newIdAvailable = idExpected + 1

    //Initializing ProfessorAccount and getting the signature of the transaction
    const signature = await initializeProfessor(program, wallet2);

    //Confirming the previous transaction in the validator node
    await connection.confirmTransaction(signature.toString())

    //Getting all the information relative to the transaction that has been carried out
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });

    /* Getting the Return Log from the transaction information in order to get the boolean returned from the SC (Rust) function
     * 'buffer' contains the raw binary information of the return, which contains the information of the boolean returned by the tested method
    */
    const [key, data, buffer] = getReturnLog(transaction);
    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    //Fetching the data of the new account created through its PDA
    const newProfessorAccount = await fetchProfessorAccount(program, wallet2.publicKey);

    //The ID of the new Professor Account must be equal to the idExpected param (which is the ID provided by the ID's generator for Professor)
    expect(new anchor.BN(newProfessorAccount.id).eq(new anchor.BN(idExpected))).to.be.true;

    //The identifierCode hash must be equal to the sha256 hash of '1111' (which is the identifier of every Professor to have certain privileges)
    assert.equal(newProfessorAccount.identifierCodeHash, CryptoJS.SHA256("2222").toString());

    //The program must return true if everything is correct
    expect(program_return).to.be.true;

  });

  it("Reinitializing the same professor with different ID...", async () => {

    /**
     * Trying to initialize a new Professor Account for the same wallet --> 
     * Since the PDA (address) is calculated through the wallet's PublicKey, the PDA will result in the same than the previous initialization
     * This will raise up an error due to the constraint init, which cannot init an account with an address which is already initializated
     */
    try {
      await initializeProfessor(program, wallet2);
    } catch (err) {
      assert.instanceOf(err, Error);
      return;
    }

    //The test is expecting an error, so it will fail if an error is not raised
    assert.fail("Expected an error to be thrown");

  });

  it("Student is initializated properly", async () => {

    
     /*
     * Check if ID's generator for Student accounts exist --> 
     * If so, the smaller ID available is obtained from it 
     * If not, the new ID will be 0 since no ID's generator created implies no Professor Acccount has been created previously
    */
    var idExpected = 0;
    try {
      let studentIdGeneratorBefore = await fetchIdAccount(program, "student");
      idExpected = studentIdGeneratorBefore.smallerIdAvailable;
    } catch (err) {
      assert.instanceOf(err, Error);
    }

     //The new ID that should be available in the ID's generator after creating the new Professor account
     const newIdAvailable = idExpected + 1

     //Initializing StudentAccount and getting the signature of the transaction
     const signature = await initializeStudent(program, wallet3);
 
     //Confirming the previous transaction in the validator node
     await connection.confirmTransaction(signature.toString())
 
     //Getting all the information relative to the transaction that has been carried out
     const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
 
     /* Getting the Return Log from the transaction information in order to get the boolean returned from the SC (Rust) function
      * 'buffer' contains the raw binary information of the return, which contains the information of the boolean returned by the tested method
     */
     const [key, data, buffer] = getReturnLog(transaction);
     const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
     const program_return = Boolean(reader_U8);

    //Fetching the data of the new account created through its PDA
    const newStudentAccount = await fetchStudentAccount(program, wallet3.publicKey);

    //Getting the data of the Student ID's generator
    const studentIdGeneratorAfterCreating = await fetchIdAccount(program, "student");

     //The ID of the new Student Account must be equal to the idExpected param (which is the ID provided by the ID's generator for Students)
    expect(new anchor.BN(newStudentAccount.id).eq(new anchor.BN(idExpected))).to.be.true;

    // The new smaller availabled ID on the ID's generator must be equal to the param newIdAvailable (i.e. the new id available must have been incremented in +1)
    expect(new anchor.BN(studentIdGeneratorAfterCreating.smallerIdAvailable).eq(new anchor.BN(newIdAvailable))).to.be.true;

    //The identifierCode hash must be equal to the sha256 hash of '1111' (which is the identifier of every highRank to have certain privileges)
    assert.equal(newStudentAccount.identifierCodeHash, CryptoJS.SHA256("3333").toString());

   //The program must return true if everything is correct
    expect(program_return).to.be.true;
  });

  it("Faculty is properly initializated", async () => {

    //Giving extra funds (SOL) to wallet1 (which is allowed by a HighRank user)
    getExtraFunds(connection, 50, wallet1) 

    var correct = true;
    var idExpected = 0;

    /*
     * Check if ID's generator for HighRank accounts exist --> 
     * If so, the smaller ID available is obtained from it and saved in 'idExpected'
     * If not, the new ID will be 0 since no ID's generator created implies no HighRank Account has been created previously
    */
    try {
      const account = await fetchIdAccount(program, "faculty");
      idExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
      correct = false;
    }

    /*
    * IdGenerator must be generated independently (unlike user's ID's generators) if it does not exist yet
    */
    if (!correct) {
      await initializeIdGenerator(program, wallet1, "faculty")
    }


    // Initializing FacultyAccount and getting the signature of the transaction
    const signature = await initializeFaculty(program, wallet1, idExpected, "Asignatura de prueba")

    //Confirming the previous transaction in the validator node
    await connection.confirmTransaction(signature.toString())

    //Getting all the information relative to the transaction that has been carried out
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });

  /* Getting the Return Log from the transaction information in order to get the boolean returned from the SC (Rust) function
   * 'buffer' contains the raw binary information of the return, which contains the information of the boolean returned by the tested method
  */
    const [key, data, buffer] = getReturnLog(transaction);
    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    //Fetching the data of the new account created through its PDA
    const newFacultyAccount = await fetchFacultyAccount(program, idExpected);

    //Getting the data of the Faculty ID's generator
    const FacultyIdGeneratorAccount = await fetchIdAccount(program, "faculty");

      //The ID of the new Faculty Account must be equal to the idExpected param (which is the ID provided by the ID's generator for Faculty)
    expect(new anchor.BN(newFacultyAccount.id).eq(new anchor.BN(idExpected))).to.be.true;

    // The new smaller availabled ID on the ID's generator must be equal to 'idExpected' incremented in +1)
    expect(new anchor.BN(FacultyIdGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;

    // The program must return true if everything is correct
    expect(program_return).to.be.true;
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

    const newDegreeAccount = await fetchDegreeAccount(program, idExpected);
    const degreeIdGeneratorAccount = await fetchIdAccount(program, "degree");

    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    expect(new anchor.BN(newDegreeAccount.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(degreeIdGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;
    expect(program_return).to.be.true;

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

    const newSpecialtyAccount = await fetchSpecialtyAccount(program, idExpected);
    const degreeIdGeneratorAccount = await fetchIdAccount(program, "specialty");

    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);


    expect(new anchor.BN(newSpecialtyAccount.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(degreeIdGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;
    expect(program_return).to.be.true;

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

    /*
     * Account cannot be created since the provided ID is invalid (less than 0)
     * One of the constraints in the SC must raise an error, which is expected to be an instance of Error 
     * The error must also contain "A raw constraint was violated" as part of the message
    */
    try {
      await initializeSpecialty(program, wallet1, idExpected, "Especialidad de prueba", -1)
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "A raw constraint was violated");
      return;
    }

    assert.fail("Expected an error to be thrown");

  });

  it("Subject is properly initializated", async () => {

    //creating a new aux professor
    const auxSignature = await initializeProfessor(program, wallet4);
    await connection.confirmTransaction(auxSignature.toString())
    const auxTransaction = await connection.getTransaction(auxSignature.toString(), { commitment: "confirmed" });
    const auxProfessorAccount = await fetchProfessorAccount(program, wallet4.publicKey);

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


    /* Due to a previous test --> there will always be a professor with ID '0' 
     * The aux professor's id is passed as part of the array of professors' id via 'auxProfessorAccount.id'
    */
    const signature = await initializeSubject(program, wallet1, idExpected, "Especialidad de prueba", 0, 0, { first:{} }, [0, Number(auxProfessorAccount.id)], [0])
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);

    const newSubjectAccount = await fetchSubjectAccount(program, idExpected);
    const subjectIdGeneratorAccount = await fetchIdAccount(program, "subject");

    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    expect(new anchor.BN(newSubjectAccount.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(subjectIdGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;
    expect(new anchor.BN(newSubjectAccount.degreeId).eq(new anchor.BN(0))).to.be.true;

    //'deep.equal' is used to compare the actual content of the objects and not the memory reference (which will be always false since the references cannot be the same)
    
    //Checking if the course is equal to SubjectCourse::First (enum in Rust)
    expect(newSubjectAccount.course).to.deep.equal( {first: {} } );  

    expect(newSubjectAccount.students).to.deep.equal( [0]);   
    expect(program_return).to.be.true;
  });

  it("Subject is initializated with incorrect professor ID", async () => {

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

    try {
      const signature = await initializeSubject(program, wallet1, idExpected, "Especialidad de prueba", 0, 0, { first:{} }, [-1,2,3], [0])
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Incorrect professor's id");
      return;
    } 

    assert.fail("Expected an error to be thrown");

  });

  it("Proposal is created properly by Student", async () => {

    getExtraFunds(connection, 50, wallet3) // wallet3 is allowed by a Student
    var correct = true;
    var idExpected = 0;

    try {
      const account = await fetchIdAccount(program, "proposal");
      idExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
      correct = false;
    }

    if (!correct) {
      await initializeIdGenerator(program, wallet3, "proposal")
    }

    const signature = await initializeProposalByStudent(program, wallet3, idExpected, "Propuesta de prueba", "Desarollo o contenido de la propuesta de prueba", 0)
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);

    const newProposalAccount = await fetchProposalAccount(program, idExpected);
    const proposalIdGeneratorAccount = await fetchIdAccount(program, "proposal");
    const studentAccount = await fetchStudentAccount (program, wallet3.publicKey)
    const subjectAccount = await fetchSubjectAccount(program, newProposalAccount .subjectId)

    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    expect(new anchor.BN(newProposalAccount.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(proposalIdGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;

    //Checking that the subjectId of the proposal is correct (the subject that the proposal is derived from)
    expect(new anchor.BN(newProposalAccount.subjectId).eq(new anchor.BN(0))).to.be.true;

    //The ending_timestamp field must be equal to the publishingTimestamp plus 1 month (duration of the proposal) which is equal to 2592000 seconds in Unix Timestamp format
    expect(Number(newProposalAccount .publishingTimestamp) + 2592000).eq(Number(newProposalAccount .endingTimestamp)); 
    
    //The ID of the creator (sender) of the transaction must be properly registered in the field creatorId in the proposal
    expect(new anchor.BN(studentAccount.id).eq(new anchor.BN(newProposalAccount.creatorId))).to.be.true;   
     
    //The expected votes (as established in the SC) must be equal to the amount of professors and students that owe the subject
    //20 votes are added in order to bear in mind the votes of professionals that are not registered in the subjects neither as students nor as professors
    expect(new anchor.BN(newProposalAccount .expectedVotes).eq(new anchor.BN(subjectAccount.students.length + subjectAccount.professors.length + 20)))      

    expect(program_return).to.be.true;
  });

  it("Proposal is created properly by Professor", async () => {

    getExtraFunds(connection, 50, wallet2) // wallet2 is allowed by a Professor
    var correct = true;
    var idExpected = 0;

    try {
      const account = await fetchIdAccount(program, "proposal");
      idExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
      correct = false;
    }

    if (!correct) {
      await initializeIdGenerator(program, wallet2, "proposal")
    }

    const signature = await initializeProposalByProfessor(program, wallet2, idExpected, "Propuesta de prueba de profesor", "Desarollo o contenido de la propuesta de prueba por parte de profesor", 0)
    await connection.confirmTransaction(signature.toString())
    const transaction = await connection.getTransaction(signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(transaction);

    const newProposalAccount = await fetchProposalAccount(program, idExpected);
    const proposalIdGeneratorAccount = await fetchIdAccount(program, "proposal");
    const professorAccount = await fetchProfessorAccount (program, wallet2.publicKey)
    const subjectAccount = await fetchSubjectAccount(program, newProposalAccount.subjectId)

    const reader_U8 = new Borsh.BinaryReader(buffer).readU8;
    const program_return = Boolean(reader_U8);

    //Exactly the same verifications than the creation of proposal by an student
    expect(new anchor.BN(newProposalAccount.id).eq(new anchor.BN(idExpected))).to.be.true;
    expect(new anchor.BN(proposalIdGeneratorAccount.smallerIdAvailable).eq(new anchor.BN(idExpected + 1))).to.be.true;
    expect(new anchor.BN(newProposalAccount.subjectId).eq(new anchor.BN(0))).to.be.true;
    expect(Number(newProposalAccount.publishingTimestamp) + 2592000).eq(Number(newProposalAccount.endingTimestamp));    
    expect(new anchor.BN(professorAccount.id).eq(new anchor.BN(newProposalAccount.creatorId))).to.be.true;  
    expect(new anchor.BN(newProposalAccount.expectedVotes).eq(new anchor.BN(subjectAccount.students.length + subjectAccount.professors.length + 20))).to.be.true;                                     
    expect(program_return).to.be.true;
  });

  it ("Proposal is properly voted by a student", async () => {

    getExtraFunds(connection, 50, wallet3) // wallet3 is allowed by a Student
    var correct = true;
    var idExpected = 0;


    //Creating new proposal (just exactly the previous tests)
    try {
      const account = await fetchIdAccount(program, "proposal");
      idExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
      correct = false;
    }

    if (!correct) {
      await initializeIdGenerator(program, wallet3, "proposal")
    }

    const signature = await initializeProposalByStudent(program, wallet3, idExpected, "Propuesta Correcta", "Desarollo o contenido de la propuesta de prueba correcta", 0)
    await connection.confirmTransaction(signature.toString())
   
  
    //Fetching the proposal account before voting
    const proposalAccount = await fetchProposalAccount(program, idExpected);


    //the creator is going to vote 'true' over the proposal
    const vote_signature = await voteProposalByStudent(program, wallet3, Number(proposalAccount.id), Number(proposalAccount.subjectId), true)
    await connection.confirmTransaction(vote_signature.toString())
    const transaction = await connection.getTransaction(vote_signature.toString(), { commitment: "confirmed" });

    //Getting the Program Return
    const [key, data, buffer] = getReturnLog(transaction);
    const program_return = new Borsh.BinaryReader(buffer).readString();
  

    // const program_return = TypeDef(reader_U8);


    //Fetching the proposal account after voting
    const proposalAccountAfterVoting = await fetchProposalAccount(program, idExpected);

    //The creator is voting in favor of the proposal, so the supporting_votes field must be incremented in +1
    expect(new anchor.BN(proposalAccount.supportingVotes + 1).eq(new anchor.BN(proposalAccountAfterVoting.supportingVotes))).to.be.true;

    //The against_votes field must remain equal (i.e. with value 0)
    expect(new anchor.BN(proposalAccount.againstVotes).eq(new anchor.BN(proposalAccountAfterVoting.againstVotes))).to.be.true;

    //After voting, the votation must continue being 'VotationInProgress'
    expect(program_return).to.deep.equal("VotationInProgress")
  
  })

  it("Proposal trying to be voted by the same student (the creator, in this case)", async() => {

    getExtraFunds(connection, 50, wallet3) // wallet3 is allowed by a Student
    var correct = true;
    var idExpected = 0;

    try {
      const account = await fetchIdAccount(program, "proposal");
      idExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
      correct = false;
    }

    if (!correct) {
      await initializeIdGenerator(program, wallet3, "proposal")
    }

    const signature = await initializeProposalByStudent(program, wallet3, idExpected, "Propuesta Correcta", "Desarollo o contenido de la propuesta de prueba correcta", 0)
    const proposalAccount = await fetchProposalAccount(program, idExpected);
   

    //the creator is going to vote 'true' over the proposal
    await voteProposalByStudent(program, wallet3, Number(proposalAccount.id), Number(proposalAccount.subjectId), true)
   
    try {
      await voteProposalByStudent(program, wallet3, Number(proposalAccount.id), Number(proposalAccount.subjectId), false)

    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "UserHasAlreadyVoted");
      return
    }

    assert.fail("Expected an error to be thrown");

  });

  it ("Forcing the test to finalize (reaching the number of expecting votes) and voting true ", async () => {

    getExtraFunds(connection, 50, wallet3) // wallet3 is allowed by a Student
    var correct = true;
    var idExpected = 0;

    //Creating new proposal (just exactly as the previous tests)
    try {
      const account = await fetchIdAccount(program, "proposal");
      idExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
      correct = false;
    }

    if (!correct) {
      await initializeIdGenerator(program, wallet3, "proposal")
    }

    const signature = await initializeProposalByStudent(program, wallet3, idExpected, "Propuesta Correcta", "Desarollo o contenido de la propuesta de prueba correcta", 0)
    await connection.confirmTransaction(signature.toString())

  
    //Fetching the proposal account before voting
    const proposalAccountBeforeVoting = await fetchProposalAccount(program, idExpected);

    //Geting the number of professor and students from the subject that the proposal allows to
    const subjectAccount = await fetchSubjectAccount(program, proposalAccountBeforeVoting.subjectId);
    const number_of_votes_expected = Number(subjectAccount.professors.length + subjectAccount.students.length + 20)

    //Subscribing to the event emitted when the votation is finished and accepted 
    let event_emitted: any;
    program.addEventListener("NewProfessorProposalCreated", (event, _slot, _signature) => {event_emitted = event} )
    
    
    //We create students to vote in favor until the number of votes expected is reached and the votation is forced to finalize
    let vote_signature: String;
    for (var i=0; i<number_of_votes_expected; i++) {
      alternativeWallet = await createWallet(connection, 10);
      await initializeStudent (program, alternativeWallet)
      vote_signature = await voteProposalByStudent(program, alternativeWallet, Number(proposalAccountBeforeVoting.id), Number(proposalAccountBeforeVoting.subjectId), true)
      await connection.confirmTransaction(vote_signature.toString())
   
  }

  //Fetching the proposal account after voting
  const proposalAccountAfterVoting = await fetchProposalAccount(program, idExpected);

  expect(new anchor.BN(proposalAccountAfterVoting.againstVotes + proposalAccountAfterVoting.supportingVotes).eq(new anchor.BN(number_of_votes_expected))).to.be.true;
  
    //Getting the Program Return
    const lastVotingTransaction = await connection.getTransaction(vote_signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(lastVotingTransaction);
    const program_return = new Borsh.BinaryReader(buffer).readString();
  
    //After completing the voting process, the votation must continue being 'WaitingForTeacher' since all students voted 'true' (supporting the proposal)
    expect(program_return).to.deep.equal("WaitingForTeacher")

    //fetching the professorProposalIdHandler
    const professorProposalIdHandler = await fetchIdAccount(program, "professorProposal");
    const idExpectedFromProfessorProposal = Number(professorProposalIdHandler.smallerIdAvailable - 1)

   
    //Checking the result emitted is correct
    expect(event_emitted).to.deep.equal({ proposalId: proposalAccountAfterVoting.id, professorProposalId:idExpectedFromProfessorProposal } )
  });

  it ("Forcing the test to finalize (reaching the number of expecting votes) and voting false", async () => {
    
    getExtraFunds(connection, 50, wallet3) // wallet3 is allowed by a Student
    var correct = true;
    var idExpected = 0;

    //Creating new proposal (just exactly as the previous tests)
    try {
      const account = await fetchIdAccount(program, "proposal");
      idExpected = account.smallerIdAvailable
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.toString(), "Account does not exist");
      correct = false;
    }

    if (!correct) {
      await initializeIdGenerator(program, wallet3, "proposal")
    }

    const signature = await initializeProposalByStudent(program, wallet3, idExpected, "Propuesta Correcta", "Desarollo o contenido de la propuesta de prueba correcta", 0)
    await connection.confirmTransaction(signature.toString())

  
    //Fetching the proposal account before voting
    const proposalAccountBeforeVoting = await fetchProposalAccount(program, idExpected);

    //Geting the number of professor and students from the subject that the proposal allows to
    const subjectAccount = await fetchSubjectAccount(program, proposalAccountBeforeVoting.subjectId);
    const number_of_votes_expected = Number(subjectAccount.professors.length + subjectAccount.students.length + 20)
    
    
    //We create students to vote in favor until the number of votes expected is reached and the votation is forced to finalize
    let vote_signature: String;
    for (var i=0; i<number_of_votes_expected; i++) {
      alternativeWallet = await createWallet(connection, 10);
      await initializeStudent (program, alternativeWallet)
      vote_signature = await voteProposalByStudent(program, alternativeWallet, Number(proposalAccountBeforeVoting.id), Number(proposalAccountBeforeVoting.subjectId), false)
      await connection.confirmTransaction(vote_signature.toString())
  }

  //Fetching the proposal account after voting
  const proposalAccountAfterVoting = await fetchProposalAccount(program, idExpected);
  expect(new anchor.BN(proposalAccountAfterVoting.againstVotes + proposalAccountAfterVoting.supportingVotes).eq(new anchor.BN(number_of_votes_expected))).to.be.true;
  
  
    //Getting the Program Return
    const lastVotingTransaction = await connection.getTransaction(vote_signature.toString(), { commitment: "confirmed" });
    const [key, data, buffer] = getReturnLog(lastVotingTransaction);
    const program_return = new Borsh.BinaryReader(buffer).readString();
  
    //After completing the voting process, the votation must continue being 'Rejecting' since all students voted 'false' (against the proposal)
    expect(program_return).to.deep.equal("Rejected")
  
  });

 
 

});
