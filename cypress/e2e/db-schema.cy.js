describe('Application Server', () => {
  it('successfully loads the app', () => {
    cy.visit('/');
    cy.get('body').should('exist');
  });

  it('verifies DB and Schemas via Integration API', () => {
    cy.request('/api/test-db').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.success).to.be.true;
      
      const { results } = response.body;
      expect(results.connection).to.be.true;
      expect(results.cleanup).to.be.true;
      
      results.validations.forEach(v => {
        cy.log(`Checking: ${v.name}`);
        expect(v.status).to.eq('PASS', v.error || 'Validation failed');
      });
    });
  });
});
