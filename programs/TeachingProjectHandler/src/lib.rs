use anchor_lang::prelude::*;
use std::mem::size_of;
use sha256::digest;

declare_id!("Hd3HLLMfbMJonaCvcQ8GugmTdKsGoHvce1JfAUU2gmiS");

#[program]
pub mod teaching_project_handler {

    use super::*;

    pub fn create_high_rank(ctx: Context<CreateHighRank>, user_type_code:String) -> Result<bool> {
        
        let high_rank_account = &mut *ctx.accounts.high_rank_account;
        high_rank_account.id = general_id_generator(&mut ctx.accounts.high_rank_id_handler);
        high_rank_account.identifier_code_hash = digest(user_type_code);
        high_rank_account.authority = *ctx.accounts.authority.key;

        Ok(true)
    }

    pub fn create_professor(ctx: Context<CreateProfessor>, user_type_code:String) -> Result<bool> {
        let professor_account = &mut *ctx.accounts.professor_account;
        professor_account.id = general_id_generator(&mut ctx.accounts.professor_id_handler);
        professor_account.identifier_code_hash = digest(user_type_code);
        professor_account.authority = *ctx.accounts.authority.key;
        Ok(true)
    }

    pub fn create_student(ctx: Context<CreateStudent>, user_type_code:String) -> Result<bool> {

        let student_account = &mut *ctx.accounts.student_account;
        student_account.id = general_id_generator(&mut ctx.accounts.student_id_handler);
        student_account.identifier_code_hash = digest(user_type_code);
        student_account.authority = *ctx.accounts.authority.key;
        
        Ok(true)
    }

    pub fn create_faculty (ctx: Context<CreateFaculty>, name:String) -> Result<bool> {

        let faculty_account = &mut *ctx.accounts.faculty_account;
        faculty_account.id = general_id_generator(&mut ctx.accounts.faculty_id_handler);
        faculty_account.name = name;

        Ok(true)
    }

    pub fn create_degree (ctx: Context<CreateDegree>, name:String, faculty_id: i32) -> Result<bool> {

        let degree_account = &mut *ctx.accounts.degree_account;
        degree_account.id = general_id_generator(&mut ctx.accounts.degree_id_handler);
        degree_account.name = name;
        degree_account.faculty_id = faculty_id;

        Ok(true)
    }

    pub fn create_specialty (ctx: Context<CreateSpecialty>, name:String, degree_id: i32) -> Result<bool> {

        let specialty_account = &mut *ctx.accounts.specialty_account;
        specialty_account.id = general_id_generator(&mut ctx.accounts.specialty_id_handler);
        specialty_account.name = name;
        specialty_account.degree_id = degree_id;

        Ok(true)
    }

    pub fn create_subject(ctx: Context<CreateSubject>, name:String, degree_id: i32, specialty_id: i32, course: SubjectCourse, professors: Vec<i32>) -> Result<bool> {

        let subject_account = &mut *ctx.accounts.subject_account;
        subject_account.id = general_id_generator(&mut ctx.accounts.subject_id_handler);
        subject_account.name = name;
        subject_account.degree_id = degree_id;
        subject_account.specialty_id = specialty_id;
        subject_account.course = course;

        let professor_id_handler = &mut *ctx.accounts.professor_id_handler;

        for professor_id in &professors {
            if (professor_id.clone() >= professor_id_handler.smaller_id_available) || professor_id.clone() < 0 {
                return Err(error!(ErrorCode::IncorrectProfessorId));
            }
        }
        subject_account.professor = professors;

        Ok(true)
    }

    pub fn create_id_generator_for(ctx: Context<CreateIdHandler>, _specification: String) -> Result<bool> {
        let id_generator_account = &mut *ctx.accounts.specification_id_handler;
        id_generator_account.smaller_id_available = 0;
        Ok(true)
    }

}






                                                        // ------- AUX FUNCTIONS ------------- //

fn general_id_generator (id_handler_account: &mut Account<IdHandler>) ->  i32 {
    let id: i32 = id_handler_account.smaller_id_available;
    id_handler_account.smaller_id_available = id_handler_account.smaller_id_available + 1;
    return id;
}

// fn subjectCourseIsValid (course: SubjectCourse) {
//     match course {
//         SubjectCourse::First || SubjectCourse::Second || Sube
//     }
// }







                          // --------- ACCOUNTS DATA STRUCTURES (CONTEXT PARAM IN MOD teaching_project_handler FUNCTIONS) ----- 

#[derive(Accounts)]
#[instruction(_specification: String)]
pub struct CreateIdHandler<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [(_specification.clone() + "IdHandler").as_bytes().as_ref()],
        bump
    )]
    pub specification_id_handler: Account<'info,IdHandler>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
#[instruction (user_type_code: String)]
pub struct CreateHighRank<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"highRankIdHandler"],
        bump
    )]
    pub high_rank_id_handler: Account<'info,IdHandler>,

    #[account(init, 
        payer=authority, 
        space = size_of::<HighRank>() + 12 + 100, 
        seeds=[b"highRank", authority.key().as_ref()],
        bump,
        constraint = digest(user_type_code) == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c")
    ]
    pub high_rank_account: Account<'info, HighRank>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
#[instruction (user_type_code: String)]
pub struct CreateProfessor<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"professorIdHandler"],
        bump
    )]
    pub professor_id_handler: Account<'info,IdHandler>,

    #[account(init, 
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
#[instruction (user_type_code: String)]
pub struct CreateStudent<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = size_of::<IdHandler>() + 140,
        seeds = [b"studentIdHandler"],
        bump
    )]
    pub student_id_handler: Account<'info,IdHandler>,


    #[account(init, 
        payer=authority, 
        space = size_of::<Student>() + 12 + 100 + 100, 
        seeds=[b"student", authority.key().as_ref()],
        bump,
        constraint = digest(user_type_code) == "318aee3fed8c9d040d35a7fc1fa776fb31303833aa2de885354ddf3d44d8fb69")
    ]
    pub student_account: Account<'info, Student>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
#[instruction (name: String)]
pub struct CreateFaculty<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub faculty_id_handler: Account<'info,IdHandler>,

    #[account(has_one = authority)] 
    pub high_rank: Account<'info, HighRank>,

    #[account(init, 
        payer=authority, 
        space = size_of::<Faculty>() + name.as_bytes().len() + 4, 
        seeds=[b"faculty", faculty_id_handler.smaller_id_available.to_le_bytes().as_ref()], 
        bump,
        constraint = high_rank.identifier_code_hash == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = name.len() <= 500
    )]
    pub faculty_account: Account<'info, Faculty>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
#[instruction (name: String, faculty_id:i32)]
pub struct CreateDegree<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub degree_id_handler: Account<'info,IdHandler>,

    #[account(mut)]
    pub faculty_id_handler: Account<'info, IdHandler>,

    #[account(has_one = authority)] 
    pub high_rank: Account<'info, HighRank>,

    #[account(init, 
        payer=authority, 
        space = size_of::<Degree>() + name.as_bytes().len() + 4, 
        seeds=[b"degree", degree_id_handler.smaller_id_available.to_le_bytes().as_ref()], 
        bump,
        constraint = high_rank.identifier_code_hash == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = name.len() <= 500,
        constraint = (faculty_id >= 0 && faculty_id < faculty_id_handler.smaller_id_available)
    )]
    pub degree_account: Account<'info, Degree>,

    pub system_program: Program<'info,System>
}

#[derive(Accounts)]
#[instruction (name: String, degree_id:i32)]
pub struct CreateSpecialty <'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub specialty_id_handler: Account<'info, IdHandler>,

    #[account(mut)]
    pub degree_id_handler: Account<'info, IdHandler>,

    #[account(has_one = authority)] 
    pub high_rank: Account<'info, HighRank>,

    #[account(init, 
        payer=authority, 
        space = size_of::<Specialty>() + name.as_bytes().len() + 4, 
        seeds=[b"specialty", specialty_id_handler.smaller_id_available.to_le_bytes().as_ref()], 
        bump,
        constraint = high_rank.identifier_code_hash == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = name.len() <= 500,
        constraint = (degree_id >= 0 && degree_id < degree_id_handler.smaller_id_available)
    )]
    pub specialty_account: Account<'info, Specialty>,

    pub system_program: Program<'info,System>
}


#[derive(Accounts)]
#[instruction (name: String, degree_id: i32, specialty_id: i32, course: SubjectCourse)]
pub struct CreateSubject<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut, has_one = authority)]      // Se comprueba que la cuenta de "Alto cargo" pasada pertenece a quien firma la transacción (autenticación)
    pub high_rank: Account<'info, HighRank>,

    #[account(mut)]
    pub subject_id_handler: Account<'info,IdHandler>,

    #[account()]
    pub degree_id_handler: Account<'info,IdHandler>,

    #[account()]
    pub specialty_id_handler: Account<'info,IdHandler>,

    #[account()]
    pub professor_id_handler: Account<'info, IdHandler>,

    #[account(init, 
        payer=authority, 
        space = size_of::<Subject>() + name.as_bytes().len(), 
        seeds=[b"subject", subject_id_handler.smaller_id_available.to_le_bytes().as_ref()], 
        bump,
        constraint = high_rank.identifier_code_hash == "0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c",
        constraint = (degree_id >= 0) && (degree_id < degree_id_handler.smaller_id_available),
        constraint = (specialty_id == -1) || (specialty_id >= 0 && specialty_id < specialty_id_handler.smaller_id_available)
    )]
    pub subject_account: Account<'info, Subject>,

    pub system_program: Program<'info, System>
}





                                                // -------------- ACCOUNTS (DATA STRUCTS) --------------------- //


//  ----Users ----  // 

#[account]
#[derive(Default)]
pub struct HighRank {
    id: i32,                                // 8 bytes
    identifier_code_hash: String,           // Tamaño real: 32 bytes + 4 (alineación) = 36 bytes || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 12 bytes
    authority: Pubkey,                      // 32 bytes
    pendent_professor_proposals: Vec<i64>   // Suponiendo 15 propuestas: 15*8 bytes (120 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 100 bytes
}

#[account]
#[derive(Default)]
pub struct IdHandler {
    smaller_id_available: i32,
    reused_id: Vec<i64>                     // Suponiendo 20 id's: 20*8 bytes (160 bytes + 4 alineación) || Tamaño por defecto: 24 (20 + 4 alineación) --> dif = + 140 bytes
}

#[account]
#[derive(Default)]
pub struct Professor {
    id: i32,                                      // 8 bytes
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
    id: i32,                               // 8 bytes
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
id: i32,      // 8 bytes
name: String  // Longitud variable (máx establecido en 200 caracteres)
}

#[account]
#[derive(Default)]
pub struct Degree {
id: i32,
name: String,
faculty_id: i32
}

#[account]
#[derive(Default)]
pub struct Specialty {
id: i32,
name: String,
degree_id: i32
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
id: i32,
degree_id: i32,
specialty_id: i32,
course: SubjectCourse,
professor: Vec<i32>,
pending_proposals: Vec<i32>
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




                                                          //---------------ENUMS--------------------//

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


//----------------Errors-----------------//
#[error_code]
pub enum ErrorCode {
    #[msg("Incorrect professor's id submitted")]
     IncorrectProfessorId
}
