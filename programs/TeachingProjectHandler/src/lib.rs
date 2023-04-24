use anchor_lang::prelude::*;
use std::mem::size_of;
use sha256::digest;




declare_id!("Hd3HLLMfbMJonaCvcQ8GugmTdKsGoHvce1JfAUU2gmiS");

#[program]
pub mod teaching_project_handler {

    use super::*;

    pub fn create_high_rank(ctx: Context<CreateHighRank>, user_type_code:String, id: i64) -> Result<bool> {
        let high_rank_account = &mut *ctx.accounts.high_rank_account;
        high_rank_account.id = id;
        high_rank_account.identifier_code_hash = digest(user_type_code);
        high_rank_account.authority = *ctx.accounts.authority.key;

        Ok(true)
    }

    pub fn create_professor(ctx: Context<CreateProfessor>, user_type_code:String, id: i64) -> Result<bool> {
        let professor_account = &mut *ctx.accounts.professor_account;
        professor_account.id = id;
        professor_account.identifier_code_hash = digest(user_type_code);
        professor_account.authority = *ctx.accounts.authority.key;
        Ok(true)
    }

    pub fn create_student(ctx: Context<CreateStudent>, user_type_code:String, id: i64) -> Result<bool> {
        let student_account = &mut *ctx.accounts.student_account;
        student_account.id = id;
        student_account.identifier_code_hash = digest(user_type_code);
        student_account.authority = *ctx.accounts.authority.key;
        Ok(true)
    }

    pub fn create_faculty (ctx: Context<CreateFaculty>, id: i64, name:String) -> Result<bool> {
        let faculty_account = &mut *ctx.accounts.faculty_account;
        faculty_account.id = id;
        faculty_account.name = name;
        Ok(true)
    }



}

#[derive(Accounts)]
#[instruction (user_type_code: String, id:i64)]
pub struct CreateHighRank<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(init_if_needed, 
        payer=authority, 
        space = size_of::<HighRank>() + 12 + 100, 
        seeds=[b"highRank", authority.key().as_ref()],
        bump,
        constraint = digest(user_type_code) == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = id >= 0)
    ]
    pub high_rank_account: Account<'info, HighRank>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
#[instruction (user_type_code: String)]
pub struct CreateProfessor<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(init_if_needed, 
        payer=authority, 
        space = size_of::<Professor>() + 12 + 60 + 100 + 100, 
        seeds=[b"professor", authority.key().as_ref()],
        bump,
        constraint = digest(user_type_code) == "edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9")
    ]
    pub professor_account: Account<'info, Professor>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction (user_type_code: String, id:i64)]
pub struct CreateStudent<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(init_if_needed, 
        payer=authority, 
        space = size_of::<Student>() + 12 + 100 + 100, 
        seeds=[b"student", authority.key().as_ref()],
        bump,
        constraint = digest(user_type_code) == "318aee3fed8c9d040d35a7fc1fa776fb31303833aa2de885354ddf3d44d8fb69",
        constraint = id >= 0)
    ]
    pub student_account: Account<'info, Student>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
#[instruction (new_id: i64, name: String)]
pub struct CreateFaculty<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut, has_one = authority)]      //Se comprueba que la cuenta de "Alto cargo" pasada pertenece a quien firma la transacción (autenticación)
    pub high_rank: Account<'info, HighRank>,

    #[account(init_if_needed, 
        payer=authority, 
        space = size_of::<Faculty>() + name.as_bytes().len() - 20, 
        seeds=[b"faculty", new_id.to_le_bytes().as_ref()], 
        bump,
        constraint = digest(high_rank.identifier_code_hash.clone()) == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = name.len() <= 200
    )]
    pub faculty_account: Account<'info, Subject>,

    pub system_program: Program<'info,System>
}








#[derive(Accounts)]
#[instruction (new_id: i64)]
pub struct CreateSubject<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut, has_one = authority)]      //Se comprueba que la cuenta de "Alto cargo" pasada pertenece a quien firma la transacción (autenticación)
    pub high_rank: Account<'info, HighRank>,

    #[account(init_if_needed, 
        payer=authority, 
        space = size_of::<Subject>(), 
        seeds=[b"subject", new_id.to_le_bytes().as_ref()], 
        bump,
        constraint = digest(high_rank.identifier_code_hash.clone()) == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c"
    )]
    pub subject_account: Account<'info, Subject>,

    pub system_program: Program<'info,System>
}


//Accounts (Data Structs)


//  ----Users ----  //

#[account]
#[derive(Default, Debug)]
    pub struct HighRank {
    id: i64,                                // 8 bytes
    identifier_code_hash: String,           // Tamaño real: 32 bytes + 4 (alineación) = 36 bytes || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 12 bytes
    authority: Pubkey,                      // 32 bytes
    pendent_professor_proposals: Vec<i64>   // Suponiendo 15 propuestas: 15*8 bytes (120 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 100 bytes
}

#[account]
#[derive(Default)]
pub struct Professor {
    id: i64,                                      // 8 bytes
    identifier_code_hash: String,                 // Tamaño real: 32 bytes + 4 (alineación) = 36 bytes || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 12 bytes
    authority: Pubkey,                            // 32 bytes
    subjects: Vec<u64>,                           // Suponiendo 10 asignaturas: 10*8 bytes (80 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 60 bytes
    pendent_learning_project_proposal: Vec<i64>,  // Suponiendo 15 propuestas: 15*8 bytes (120 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 100 bytes
    pendent_votation_proposals: Vec<i64>,         // Suponiendo 15 propuestas: 15*8 bytes (120 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 100 bytes
    punishments: u8,                              // 1 byte
    rewards: u32,                                 // 4 bytes
}
    
#[account]
#[derive(Default)]
pub struct Student {
    id: i64,                               // 8 bytes
    identifier_code_hash: String,          // Tamaño real: 32 bytes + 4 (alineación) = 36 bytes || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 12 bytes
    authority: Pubkey,                     // 32 bytes
    subjects: Vec<u64>,                    // Suponiendo 15 asignaturas: 15*8 bytes (120 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 100 bytes
    pendent_votation_proposals: Vec<i64>,  // Suponiendo 15 propuestas: 15*8 bytes (120 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 100 bytes
    punishments: u8,                       // 1 byte
    rewards: u32,                          // 4 bytes
} 
    
// ------ Academic Data ------ //
#[account]
#[derive(Default)]
pub struct Faculty {
id: i64,      // 8 bytes
name: String  // Longitud variable (máx establecido en 200 caracteres)
}

#[account]
#[derive(Default)]
pub struct Degree {
id: i64,
name: String,
faculty_id: i64
}

#[account]
#[derive(Default)]
pub struct Specialty {
id: i64,
nombre: String,
degree_id: i64
}

#[account]
#[derive(Default)]
pub struct Proposal {
id: i64,
title: String,
content: String,
supporting_votes: u16,
against_votes: u16,
expected_votes: u32,
publishing_timestamp: i64,
ending_timestamp: i64,
updated_by_teacher: bool,
high_rank_validation: bool,
state: ProposalState
}

#[account]
#[derive(Default)]
pub struct Subject {
name: String,
id: i64,
faculty_id: i64,
specialty_id: i64,
course: SubjectCourse,
professor: Vec<i64>,
pending_proposals: Vec<i64>
}

#[account]
#[derive(Default)]
pub struct ProfessorProposal {
id: i64,
original_proposal_id: i64,
name: String,
publishing_timestamp: i64,
ending_timestamp: i64,
state: ProfessorProposalState
}

#[account]
#[derive(Default)]
pub struct HighRankProposal {
id: i64,
professor_proposal_id: i64
}



//Enums

#[derive(Default)]
#[derive(AnchorSerialize,AnchorDeserialize,Copy,Clone)]
pub enum ProposalState {
#[default]
NotStarted,
VotationInProgress,
WaitingForTeacher,
WaitingForHighRank,
Rejected,
Accepted
}
#[derive(Default)]
#[derive(AnchorSerialize,AnchorDeserialize,Copy,Clone)]
pub enum ProfessorProposalState { 
#[default]
Pending,
Complete
}

#[derive(Default)]
#[derive(AnchorSerialize,AnchorDeserialize,Copy,Clone)]
pub enum SubjectCourse {
#[default]
NotDefined,
First,
Second,
Third,
Fourth,
Fifth,
Sixth,
Seventh,
Eighth,
Nineth
}

