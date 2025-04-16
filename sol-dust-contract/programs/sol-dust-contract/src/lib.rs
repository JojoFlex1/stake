use anchor_lang::prelude::*;

declare_id!("JBTTq6bXjnrbxCpEwsLE9RTL9ASTpiNWavbzwDuMGYXx");

#[program]
pub mod sol_dust_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
