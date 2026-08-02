import { Switch, Route, Router as WouterRouter } from 'wouter';
import Layout from './components/Layout';
import Home from './pages/Home';
import Protocol from './pages/Protocol';
import Governance from './pages/Governance';
import Status from './pages/Status';
import Developers from './pages/Developers';
import NotFound from './pages/NotFound';

// Get base path from environment for GitHub Pages compatibility
const base = import.meta.env.BASE_URL || "/";

function App() {
  return (
    <WouterRouter base={base.endsWith('/') ? base.slice(0, -1) : base}>
      <Layout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/protocol" component={Protocol} />
          <Route path="/governance" component={Governance} />
          <Route path="/status" component={Status} />
          <Route path="/developers" component={Developers} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </WouterRouter>
  );
}

export default App;
